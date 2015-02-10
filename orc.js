var app = require('commander');
var git = require('gitty');
var path = require('path');

// process.stdin.resume();
// process.stdin.setEncoding('utf8');
// process.stdin.on('data', function(data) {
//  process.stdout.write(data);
// });

process.on('SIGINT', function () {
  console.log('Got a SIGINT. Goodbye cruel world');
  process.exit(0);
});

function _requireCommit() {

}

function checkpoint() {

}

function pull() {
	// TODO
}

function push() {
	// TODO
}

function branch() {
	// TODO
}

function status() {
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
	r = new git.Repo('.', {}, function(err, repo) {
		if(err) {
			console.log('error getting repo status');
			return;
		}
		repo.status(function(err, stats){
			console.log('stats: '+JSON.stringify(stats));
		});
	});
}

app.command('checkpoint').alias('cp').description('commit all local changes and push to repo. use this all the time!').action(checkpoint);
app.command('pull').description('pull latest from remote master into your current branch').action(pull);
app.command('push').description("use this when you're ready to submit a pull request on github: squash your branch down to one commit, run unit tests, and push.").action(push);
app.command('branch').description('helper for switching branches').action(branch);
app.command('status').alias('st').description('helper for getting status').action(status); // REMOVE

exports.checkpoint = checkpoint;
exports.pull = pull;
exports.push = push;
exports.branch = branch;
exports.main = function() {
	p = app.parse(process.argv);
	console.log('main! '+JSON.stringify(process.argv));	
};