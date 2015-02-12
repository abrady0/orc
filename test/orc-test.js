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
      orc.main(dir, [], function(err, res) {
        expect(err).not.to.be.null();
        expect(res).to.be.undefined();
      });
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

    it('should start up properly in a new github repo', function(done) {
      orc.main(dir, ['node', 'orc'], function(err, res) {
        expect(err).to.be.null();
        expect(res).to.be.true();
        done();
      });
    });
  });
});

describe('remote tests', function() {
  var gitserver;
  var repo;
  var repo2;
  var repoDir;
  var rootDir;
  var repoName = 'orctest';
  var branchName = 'foobranch';

  // create a simple git server listener
  before(function(done) {
    tmp.dir(function(err, dir) {
      rootDir = dir;
      repoDir = path.resolve(dir,repoName);
      fs.mkdirSync(repoDir);

      repo = git(repoDir);
      repo.initSync();
      repo.addRemoteSync('origin', 'http://localhost:7001/server');
      var gitserver = pushover(dir);
      gitserver.on('push', function(push) {
        push.accept();
      });
      gitserver.on('fetch', function (fetch) {
        fetch.accept();
      });
      require('http').createServer(function(req, res) {
        gitserver.handle(req, res);
      }).listen(7001, function() {
        done();
      });    
    });
  });
  // this is expected to have been done outside of orc
  it('should create the master branch and push it', function(done) {
    var fn = path.resolve(repoDir,'foo.js');
    fs.writeFileSync(fn, 'o hai');
    repo.addSync([fn]);
    repo.commitSync('bar');
    repo.push('origin', 'master', function(err, result) {
      expect(fs.existsSync(path.resolve(rootDir,'server.git'))).to.be.true();
      done();
    });
  });
  it('should create a branch based off of the latest commit on master', function(done) {
    orc.main(repoDir,['node','orc','branch',branchName], function(err, res) {
      expect(repo.getBranchesSync().current).to.equal(branchName);
      done();
    });
  });
  it('should have pushed the branch so it is visible to others', function(done) {
    tmp.dir(function(err, dir) {
      expect(err).to.be.null();
      //console.log('root dir: '+rootDir);
      //console.log('repo2 root: '+dir);
      var repo2_dir = path.resolve(dir,dir);
      git.clone(repo2_dir, 'http://localhost:7001/server', function(err) {
        expect(err).to.be.null();
        repo2 = git(repo2_dir);
        repo2.pull('origin','master',['-a'], function(err, res) {
          var co_res = repo2.checkoutSync(branchName);
          expect(co_res).to.be.ok();
          done();
        });
      });
    });
  });
  it('should checkpoint properly', function() {
    var fn = path.resolve(repoDir,'bar.js');
    fs.writeFileSync(fn, 'o hai');
    orc.main(repoDir, ['node','orc','checkpoint'], function(err, res) {
      expect(err).to.be.ok();
      expect(res).to.be.undefined();
    });
  });
  it('should fail to create a branch', function() {};
  // createBranch test: success and failure
});
/*
describe('github tests', function() {
  var repo1 = null;
  var repo2 = null;
  tmp.dir(function(err, dir) {
    child_process.execSync('git clone https://orctester:abcd1234@github.com/orctester/orctest.git', {cwd: dir});

});*/