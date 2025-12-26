{
  description = "Starknet Message Signing - TypeScript library for Starknet typed data signing and verification";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js runtime
            nodejs_22

            # Package managers
            bun
            nodePackages.npm

            # Development tools
            nodePackages.typescript
            nodePackages.typescript-language-server
          ];

          shellHook = ''
            echo "🔐 starknet-message-signing dev environment"
            echo "Node: $(node --version)"
            echo "Bun: $(bun --version)"
            echo ""
            echo "Commands:"
            echo "  bun install    - Install dependencies"
            echo "  bun run build  - Build package"
            echo "  bun run test   - Run tests"
          '';
        };
      }
    );
}
