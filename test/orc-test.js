var child_process = require('child_process');
var expect = require("chai").expect;
var fs = require('fs');
var git = require('gitty');
var path = require('path');
var pushover = require('pushover');
var tmp = require('tmp');

var orc = require('../orc.js');

describe('no repo', function() {
  it('should fail in a directory without git', function() {
    tmp.dir(function(err, dir) {
      expect(err).to.be.null();
      expect(orc.main(dir, [])).to.be.false();
    });
  });
});

describe('basic repo', function() {
  tmp.dir(function(err, dir) {
    expect(err).to.be.null();
    var repo = git(dir, []);
    repo.initSync();
    var fn = path.resolve(dir,'foo.js');
    fs.writeFileSync(fn, 'o hai');
    repo.addSync([fn]);
    repo.commitSync('foo');

    it('should start up properly in a new github repo', function() {
      expect(orc.main(dir, ['node', 'orc'])).to.be.true();
    });
  });
});

describe('remote tests', function() {
  var repo;
  var repo_dir;
  var server_dir;

  // create a simple git server listener
  before(function(done) {
    tmp.dir(function(err, dir) {
      server_dir = dir;
      repo_dir = path.resolve(dir,'orctest1');
      fs.mkdirSync(repo_dir);

      repo = git(repo_dir);
      repo.initSync();
      repo.addRemoteSync('local', 'http://localhost:7001/server');
      var repos = pushover(dir);
      repos.on('push', function(push) {
        push.accept();
      });
      require('http').createServer(function(req, res) {
        repos.handle(req, res);
      }).listen(7001, function() {
        done();
      });    
    });
  });
  it('should push to the remote', function(done) {
    console.log('server dir: '+server_dir);
    repo.push('local', 'master', function(err, result) {
      var fn = path.resolve(repo_dir,'foo.js');
      fs.writeFileSync(fn, 'o hai');
      repo.addSync([fn]);
      repo.commitSync('bar');
      expect(fs.existsSync(path.resolve(server_dir,'server.git'))).to.be.true();
      done();
    });
  });
  it('should create a branch based off of the latest commit on master', function() {
    
  });
});
/*
describe('github tests', function() {
  var repo1 = null;
  var repo2 = null;
  tmp.dir(function(err, dir) {
    child_process.execSync('git clone https://orctester:abcd1234@github.com/orctester/orctest.git', {cwd: dir});

});*/