var commander = require('commander');
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
  branches = repo.getBranchesSync();
  if (!branches.current) {
    throw new Error('error: '+repo.name+' doesn\'t appear to be a valid git repo');
  }
  return { repo_dir: dir, repo: git(dir)};
}

function _requireClean(orc) {
  var status = orc.repo.statusSync();
  if(status.unstaged.length > 0) {
    throw new Error('unstaged files, commit before running this.');
  }
  if(status.untracked.length > 0) {
    throw new Error('untracked files, add or ignore before running this.');
  }
}

// commit local changes
// push to remote
function checkpoint(orc, cb) {
  if(orc.repo.statusSync().untracked.length > 0) {
    throw new Error('untracked files, add or ignore before running this.');
  }
  if(!orc.repo.commitSync('ORC-CHECKPOINT')) {
    throw new Error('checkpoint commit failed');
  }
  orc.repo.push('origin', 'master', function(err, result) {
    if (err) {
      cb('error pushing checkpoint: '+JSON.stringify(err));
      return;
    }
    cb(null, true);
  });
}

function pull(orc, cb) {
  // TODO
}

function push(orc, cb) {
  // TODO
}

function createBranch(orc, branchName, cb) {
  _requireClean(orc);
  orc.repo.checkoutSync('master');
  orc.repo.pull('origin','master', function(err, res) {
    if (err) {
      throw new Error('failed to pull from master: '+JSON.stringify(err));
    }
    if (orc.repo.createBranchSync(branchName) !== '') {
      throw new Error('failed to create branch '+branchName);
    }
    if(!orc.repo.checkoutSync(branchName)) {
      throw new Error('couldn\'t checkout branch '+branchName);
    }
    orc.repo.push('origin', branchName, ['--set-upstream'], function(err, res) {
      if (err) {
        cb(err);
      } else {
        cb(null, true);
      }
    });
  });
  // TODO: block until done
}

function status(orc,cb) {
  // TODO: remove, just an example
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
  orc.repo.status(cb);
}

exports.main = function(dir, argv, cb) {
  if(!cb) {
    cb = function(err, res) {
      if(err) {
        console.err('error: '+JSON.stringify(err));
      } else {
        // TODO: standardize result text and output
        console.log('done. '+res);
      }
    };
  }

  var orc = _setup(dir);
  if(!orc) {
    cb('failed to init orc');
  }

  var app = new commander.Command();
  app.command('checkpoint').alias('cp').description('commit all local changes and push to repo. use this all the time!')
    .action(function() { checkpoint(orc, cb); });
  app.command('pull').description('pull latest from remote master into your current branch')
    .action(function() {pull(orc, cb); });
  app.command('push').description("use this when you're ready to submit a pull request on github: squash your branch down to one commit, run unit tests, and push.")
    .action(function() {push(orc, cb);});
  app.command('branch [name]').alias('br').description('helper for creating branches')
    .action(function(branchName) { createBranch(orc, branchName, cb); });
  app.command('status').alias('st').description('helper for getting status').action(function() { status(orc, cb);}); // REMOVE
  app.parse(argv);
};