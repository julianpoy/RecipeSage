{
  description = "RecipeSage development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    nixpkgs,
    nixpkgs-unstable,
    ...
  }: let
    systems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
    forAllSystems = f:
      nixpkgs.lib.genAttrs systems (system:
        f {
          pkgs = nixpkgs.legacyPackages.${system};
          pkgsUnstable = nixpkgs-unstable.legacyPackages.${system};
        });
  in {
    devShells = forAllSystems ({
      pkgs,
      pkgsUnstable,
    }: {
      default = pkgs.mkShell ({
          packages = [
            pkgs.nodejs_26
            (pkgs.corepack.override {nodejs-slim = pkgs.nodejs-slim_26;})
            pkgs.openssl
          ];
        }
        // pkgs.lib.optionalAttrs pkgs.stdenv.isLinux {
          PRISMA_SCHEMA_ENGINE_BINARY = "${pkgsUnstable.prisma-engines_7}/bin/schema-engine";
          NG_BUILD_SASS_EMBEDDED = "0";
          ELECTRON_OVERRIDE_DIST_PATH = "${pkgs.electron_45}/bin";
        });
    });
  };
}
