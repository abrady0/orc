var app = require('commander');
var git = require('gitty');
var path = require('path');
var pushover   = require('pushover');

process.on('SIGINT', function () {
  console.log('Got a SIGINT. Goodbye cruel world');
  process.exit(0);
});

function _setup(dir) {
  // TODO: march up to root dir just to make output consistent
  var repo = git(dir);
  try {
    branches = repo.getBranchesSync();
    if (!branches.current) {
      throw new Error('error: '+repo.name+' doesn\'t appear to be a valid git repo');
    }
  } catch (e) {
    console.error('error: problem getting info about repo '+repo.name+' '+e.message);
    return false;
  }
  return { repo_dir: dir, repo: git(dir)};
}

function _requireCommit(orc) {
  if(orc.repo.statusSync().unstages.length > 0) {
    throw new Error('unstaged files, commit before running this.');
  }
}

function checkpoint(orc) {
  // commits local changes and pushes them without unit tests
}

function pull(orc) {
  // TODO
}

function push(orc) {
  // TODO
}

function createBranch(orc, branchName) {
  _requireCommit();
  orc.repo.checkoutSync('master');
  orc.repo.pullSync();
}

function status(orc) {
  // TODO: incomplete, just an example
  /* 
  { staged: 
   [ { file: '../package.json',
       status: 'new file' } ],
  unstaged: 
   [ { file: '../.gitignore',
       status: 'modified' },
     { file: '../package.json',
       status: 'modified' } ],
  untracked: [ 'orc-test.js' ] }
  */
  orc.repo.status(function(err, stats){
    console.log('stats: '+JSON.stringify(stats));
  });
}

exports.main = function(dir, argv) {
  var orc = _setup(dir);
  if(!orc) {
    return false;
  }
  app.command('checkpoint').alias('cp').description('commit all local changes and push to repo. use this all the time!').action(function() { checkpoint(orc); });
  app.command('pull').description('pull latest from remote master into your current branch').action(function() {pull(orc); });
  app.command('push').description("use this when you're ready to submit a pull request on github: squash your branch down to one commit, run unit tests, and push.").action(function() {push(orc);});
  app.command('branch [name]').alias('br').description('helper for creating branches').action(function(branchName) { createBranch(orc, branch_name); });
  app.command('status').alias('st').description('helper for getting status').action(function() { status(orc);}); // REMOVE
  app.parse(argv);
  console.log('main! '+JSON.stringify(argv)); 
  return true;
};