{
  description = "A basic flake supporting linux and mac";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = { self, nixpkgs, ... }:
    let
      lib = nixpkgs.lib;
      systems = [ "aarch64-linux" "x86_64-linux" "aarch64-darwin" ];
      devShellForSystem = system: let
        pkgs = import nixpkgs { 
          inherit system; 
          config.allowUnfree = true; # Needed for terraform
        };
      in pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs
          bun
          # azure-cli
          # terraform
          # python3
        ];
      };
    in
    {
      devShells = lib.listToAttrs (map (system: {
        name = system;
        value = {
          default = devShellForSystem system;
        };
      }) systems);
    };
}
