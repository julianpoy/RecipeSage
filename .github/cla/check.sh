#!/bin/bash
set -euo pipefail

bot_comment_marker="<!-- cla-check -->"

head_sha=$(gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" --jq .head.sha)

commits=$(gh api --paginate "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER/commits" \
  --jq '.[] | {id: .author.id, login: .author.login, type: .author.type, name: .commit.author.name, committerLogin: .committer.login}' \
  | jq -s .)

required_authors=$(jq -c --arg exempt_logins "$CLA_EXEMPT_LOGINS" \
  '[.[] | select(.id != null and .type != "Bot" and (.login | IN($exempt_logins | split(",")[]) | not)) | {id, login}] | unique_by(.id)' <<< "$commits")
unlinked_author_names=$(jq -c --arg exempt_committer_logins "$CLA_EXEMPT_COMMITTER_LOGINS" \
  '[.[] | select(.id == null and (.committerLogin | IN($exempt_committer_logins | split(",")[]) | not)) | .name] | unique' <<< "$commits")

comments=$(gh api --paginate "repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/comments" \
  --jq '.[] | {id, userId: .user.id, userLogin: .user.login, body, url: .html_url, createdAt: .created_at}' \
  | jq -s .)

unsigned_authors="[]"
if [ "$(jq length <<< "$required_authors")" -gt 0 ]; then
  signatures_file=$(GH_TOKEN="$CLA_SIGNATURES_TOKEN" gh api "repos/$CLA_SIGNATURES_REPO/contents/$CLA_SIGNATURES_PATH")
  signatures_sha=$(jq -r .sha <<< "$signatures_file")
  signatures=$(jq -r .content <<< "$signatures_file" | base64 -d)

  unsigned_authors=$(jq -c --argjson signatures "$signatures" \
    '[.[] | select(.id | IN($signatures[].id) | not)]' <<< "$required_authors")

  if [ "$(jq length <<< "$unsigned_authors")" -gt 0 ]; then
    new_signatures=$(jq -c \
      --argjson unsigned_authors "$unsigned_authors" \
      --arg phrase "$CLA_SIGN_PHRASE" \
      --arg version "$CLA_VERSION" \
      'def normalize: ascii_downcase | gsub("^\\s+|[\\s.]+$"; "") | gsub("\\s+"; " ");
      [.[] | select((.body | normalize) == ($phrase | normalize) and (.userId | IN($unsigned_authors[].id)))]
        | group_by(.userId)
        | map(min_by(.createdAt) | {id: .userId, login: .userLogin, signedAt: .createdAt, claVersion: $version, origin: "github-actions", evidence: .url})' \
      <<< "$comments")

    if [ "$(jq length <<< "$new_signatures")" -gt 0 ]; then
      updated_signatures=$(jq --argjson new "$new_signatures" '. + $new' <<< "$signatures")
      logins=$(jq -r 'map(.login) | join(", ")' <<< "$new_signatures")
      GH_TOKEN="$CLA_SIGNATURES_TOKEN" gh api -X PUT "repos/$CLA_SIGNATURES_REPO/contents/$CLA_SIGNATURES_PATH" \
        -f message="chore: add CLA signature for $logins" \
        -f content="$(base64 -w0 <<< "$updated_signatures")" \
        -f sha="$signatures_sha" > /dev/null

      unsigned_authors=$(jq -c --argjson new "$new_signatures" \
        '[.[] | select(.id | IN($new[].id) | not)]' <<< "$unsigned_authors")
    fi
  fi
fi

existing_bot_comment=$(jq -c --arg bot_comment_marker "$bot_comment_marker" \
  '[.[] | select(.userLogin == "github-actions[bot]" and (.body | startswith($bot_comment_marker)))] | first // empty' <<< "$comments")

if [ "$(jq length <<< "$unsigned_authors")" -eq 0 ] && [ "$(jq length <<< "$unlinked_author_names")" -eq 0 ]; then
  status_state=success
  status_description="All CLA requirements met."
  if [ -n "$existing_bot_comment" ]; then
    comment_body="$bot_comment_marker
All contributors have signed the [Contributor License Agreement]($CLA_URL). Thank you!"
  else
    comment_body=""
  fi
else
  status_state=failure
  if [ "$(jq length <<< "$unsigned_authors")" -gt 0 ]; then
    status_description="Contributor License Agreement is not signed yet."
  else
    status_description="Some commit authors are not linked to a GitHub account."
  fi
  comment_body="$bot_comment_marker
Thank you for your contribution! Before we can merge this pull request, all contributors need to sign our [Contributor License Agreement]($CLA_URL).

To sign, read the agreement and then comment on this pull request with exactly:

\`\`\`
$CLA_SIGN_PHRASE
\`\`\`"
  if [ "$(jq length <<< "$unsigned_authors")" -gt 0 ]; then
    comment_body+="

These contributors still need to sign:
$(jq -r '.[] | "- @" + .login' <<< "$unsigned_authors")"
  fi
  if [ "$(jq length <<< "$unlinked_author_names")" -gt 0 ]; then
    comment_body+="

These commit authors aren't linked to a GitHub account. Add the email used on your commits to your GitHub account, then comment \`recheck\`:
$(jq -r '.[] | "- " + .' <<< "$unlinked_author_names")"
  fi
fi

if [ -n "$comment_body" ]; then
  if [ -z "$existing_bot_comment" ]; then
    gh api "repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/comments" -f body="$comment_body" > /dev/null
  elif [ "$(jq -r .body <<< "$existing_bot_comment")" != "$comment_body" ]; then
    gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$(jq -r .id <<< "$existing_bot_comment")" -f body="$comment_body" > /dev/null
  fi
fi

gh api "repos/$GITHUB_REPOSITORY/statuses/$head_sha" \
  -f state="$status_state" \
  -f context=license/cla \
  -f description="$status_description" \
  -f target_url="$CLA_URL" > /dev/null
