cd $1
rm -rf .git
git init
git remote add dokku dokku@$2:$3-$4
git add .
git commit -m "deploy autocommit"
git push dokku master