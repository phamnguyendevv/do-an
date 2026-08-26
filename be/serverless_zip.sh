PROJECT_PATH=`pwd`
TEMP_DIR=$PROJECT_PATH/.serverless/
FILE_NAME=`date +%Y-%m-%d_%H-%M-%S`

echo $TEMP_DIR
mkdir -p $TEMP_DIR
rsync -ha --progress --filter=":- .gitignore" . $TEMP_DIR
cd $TEMP_DIR
npm install
npm run build
npm prune --production

cd dist
mkdir -p $PROJECT_PATH/serverless_zip/
zip -r $PROJECT_PATH/serverless_zip/$FILE_NAME.zip . ../node_modules
echo "Zip file created at $PROJECT_PATH/serverless_zip/$FILE_NAME.zip"
