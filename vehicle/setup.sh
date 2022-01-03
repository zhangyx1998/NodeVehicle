#/bin/bash
echo "Installing NodeJS 17.x";
curl -fsSL https://deb.nodesource.com/setup_17.x | sudo -E bash - > /dev/null;
sudo apt install -y nodejs;
echo "Setting up NodeVechile runtime dependencies";
sudo apt install screen
echo "Adding supplementary utilities";