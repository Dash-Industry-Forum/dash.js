cd ../..

node node_modules/intern/runner.js config=test/functional/testsCommon.js os=windows browsers=chrome app=local_all
node node_modules/intern/runner.js config=test/functional/testsCommon.js os=windows browsers=chrome app=local_mss

cd test/functional
