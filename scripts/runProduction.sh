echo "Running Production Site 12"

echo $GITHUB_CREDENTIALS_REPO_PAT | cut -c1-10
echo $GITHUB_CREDENTIALS_REPO_NAME
echo '= Hello 1='

git clone https://jpaddison3:$GITHUB_CREDENTIALS_REPO_PAT@github.com/$GITHUB_CREDENTIALS_REPO_NAME.git Credentials 2>&1

ls

echo "== Hello 2 =="

cd Credentials 2>&1

ls

git clone https://github.com/elasticdog/transcrypt.git 2>&1
./transcrypt/transcrypt -c aes-256-cbc -p $TRANSCRYPT_SECRET -y 2>&1

echo $TRANSCRYPT_SECRET | cut -c1-10

head settings-dev.json

cd ..

echo "Hello 3"

exit 1

./build.js -run --settings ./Credentials/$SETTINGS_FILE_NAME --production
