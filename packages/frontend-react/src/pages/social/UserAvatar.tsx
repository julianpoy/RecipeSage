import { CachedImage } from "../../components/CachedImage";

export const UserAvatar = ({
  profileImages,
}: {
  profileImages?: { image: { location: string } }[];
}) => {
  const location = profileImages?.at(0)?.image.location;

  if (!location) {
    return (
      <img
        src="assets/avatar.svg"
        alt=""
        className="size-10 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <CachedImage
      src={location}
      className="size-10 shrink-0 rounded-full object-cover"
    />
  );
};
