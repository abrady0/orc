// http://www.bennadel.com/blog/2329-building-executable-scripts-for-the-mac-osx-command-line-with-node-js.htm - read this!
var commander = require('commander');
var git = require('gitty');
var path = require('path');
var pushover   = require('pushover');

process.on('SIGINT', function () {
  console.log('Got a SIGINT. Goodbye cruel world');
  process.exit(0);
});

function init(dir, cb) {
  // TODO: march up to root dir just to make output consistent
  var repo = git(dir);
  repo.getBranches(function(err, branches) {
    if(err) {
      cb('error getting branches '+err);
      return;
    }
    if (!branches.current) {
      cb('error: '+repo.name+' doesn\'t appear to be a valid git repo');
      return;
    }
    cb(null, { repo_dir: dir, repo: git(dir)});
  });
}

/**
* infer a username from the email registered with git config.
*/ 
function getUsername(cb) {
  git.config('user.email', function(err, email) {
    var split = email ? email.split('@') : [];
    if (split.length < 2) {
      cb('couldn\'t split git email'); // no name found
      return;
    }
    var userName = split[0];
    reg = /^[\w]+$/;
    if (!reg.test(userName)) {
      cb('name not all word constituents');
      return;
    }
    cb(null, userName);
  });
}

function noUnstaged(orc, cb) {
  orc.repo.status(function(err, status) {
    if(err) {
      cb({message: 'error getting status checking unstaged '+err});
      return;
    }
    if(status.unstaged.length > 0) {
      cb({message: 'unstaged files, commit before running this.'});
      return;
    }
    cb(null, true);
  });
}

function noUntracked(orc, cb) {
  orc.repo.status(function(err, status) {
    if(err) {
      cb({message: 'error getting status checking unstaged '+err});
      return;
    }
    if(status.untracked.length > 0) {
      cb({message: 'untracked files, add or ignore before running this.'});
      return;
    }
    cb(null, true);
  });
}

function repoIsClean(orc, cb) {
  noUnstaged(orc, function(err, res) {
    if (err) {
      cb(err);
      return;
    }
    noUntracked(orc, function(err, res) {
      if(err) {
        cb(err);
        return;
      }
      cb(null, true);
    });
  });
}

function repoHasChanges(orc, cb) {
  orc.repo.status(function(err, status) {
    if(err) {
      cb({message:'error getting status checking unstaged '+err});
      return;
    }
    if(status.staged.length === 0 && status.unstaged.length === 0) {
      cb({message: 'no changes, aborting.'});
      return;
    }
    cb(null, true);
  });  
}

// get master up to date
// NOTE: current branch becomes master
function checkoutAndPullMaster(orc, cb) {
  repoIsClean(orc, function(err, res) {
    if(err) {
      cb(err);
      return;
    }
    orc.repo.checkout('master', function(err, res) {
      if(err) {
        cb({message: 'failed to checkout master'+err.message});
        return;
      }
      orc.repo.pull('origin','master', cb);
    });
  });
}

// commit local changes
// push to remote
function checkpoint(orc, message, cb) {
  noUntracked(orc, function(err, res) {
    if(err) {
      cb(err);
      return;
    }
    repoHasChanges(orc, function(err, res) {
      if(err) {
        cb(err);
        return;
      }
      orc.repo.commit('ORC-CHECKPOINT'+(message?(': '+message):''), ['-a', '--no-verify'], function(err, res) {
        if(err) {
          cb({message: 'checkpoint commit failed: \n'+err.message});
          return;
        }
        orc.repo.getBranches(function(err, branches) {
          if(err) {
            cb({message: 'error getting branches: '+err.message});
            return;
          }
          orc.repo.push('origin', branches.current, ['--no-verify'], function(err, result) {
            if (err) {
              cb({message: 'error pushing checkpoint: '+JSON.stringify(err)});
              return;
            }
            cb(null, 'checkpoint finished.');
          });
        });
      });
    });
  });
}

function pull(orc, cb) {
  checkoutAndPullMaster(orc, function(err) {

  });
}

function push(orc, cb) {
  // TODO
}

function createBranch(orc, branchName, cb) {
  checkoutAndPullMaster(orc, function(err) {
    if(err) {
      cb(err);
      return;
    }
    getUsername(function(err, userName) {
      if (err) {
        console.log('error getting username: '+err);
        userName = '';
      }
      branchName = userName+'-'+branchName;
      orc.repo.createBranch(branchName, function(err, res) {
        if(err) {
          cb('failed to create branch '+branchName+': '+err.message);
          return;
        }
        orc.repo.checkout(branchName, function(err, res) {
          if(err) {
            cb('couldn\'t checkout branch '+branchName+': '+err.message);
            return;
          }
          orc.repo.push('origin', branchName, ['--set-upstream'], cb);
        });
      });
    });
  });
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

function main(dir, argv, cb) {
  if(!cb) {
    cb = function(err, res) {
      if(err) {
        console.log('error: '+err.message);
      } else {
        // TODO: standardize result text and output
        console.log('done. '+res);
      }
    };
  }

  init(dir, function(err, orc) {
    if(err) {
      cb('failed to init orc: '+err);
      return;
    }

    var app = new commander.Command();
    app.command('checkpoint [message]').alias('cp').description('commit all local changes and push to repo. use this all the time!')
      .action(function(message) { checkpoint(orc, message, cb); });
    app.command('pull').description('pull latest from remote master into your current branch')
      .action(function() {pull(orc, cb); });
    app.command('push').description("use this when you're ready to submit a pull request on github: squash your branch down to one commit, run unit tests, and push.")
      .action(function() {push(orc, cb);});
    app.command('branch [name]').alias('br').description('helper for creating branches')
      .action(function(branchName) { createBranch(orc, branchName, cb); });
    app.command('status').alias('st').description('helper for getting status').action(function() { status(orc, cb);}); // REMOVE
    app.parse(argv);
  });
}
// orc checkpoint change

exports.main = main;
