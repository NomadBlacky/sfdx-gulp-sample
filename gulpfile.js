const gulp     = require("gulp");
const fancyLog = require("fancy-log");
const sfdx     = require("sfdx-node");
const runSeq   = require("run-sequence");
const notifier = require("node-notifier");

// gulp.task('css', function () {
//     let postcss    = require('gulp-postcss');
//     let sourcemaps = require('gulp-sourcemaps');
//
//     gulp.src('postcss/**/*.css')
//         .pipe( sourcemaps.init() )
//         .pipe( postcss([ require('precss'), require('autoprefixer') ]) )
//         .pipe( sourcemaps.write('.') )
//         .pipe( gulp.dest('force-app/main/default/staticresources/') );
// });

/**
 * Task: auth
 * DevHub組織にログインして、デフォルトのDevHub組織に設定する。
 */
gulp.task('auth', () => {
    return list()
        .then(getDevHub)
        .then(devhub => {
            if(devhub) return Promise.resolve(devhub);
            return authWeb();
        })
        .then(list);
});

const list = (option = {}) => sfdx.org.list(option);

const getDevHub = list => {
    const devhub = list && list.nonScratchOrgs && list.nonScratchOrgs.filter(org => {
        return org.isDevHub && org.isDefaultDevHubUsername;
    });
    return devhub && devhub.length > 0 && devhub[0]
};

const authWeb = () => {
    return sfdx.auth.webLogin({
        setdefaultdevhubusername: true,
        setalias: 'DevHubOrg'
    });
};

/**
 * Task: create
 * ScratchOrgを作成する
 */
gulp.task('create', ['auth'], () => createScratchOrg());

const createScratchOrg = (deffile = './config/project-scratch-def.json', setdefault = true) => {
    return sfdx.org.create({
        definitionfile: deffile,
        setdefaultusername: setdefault
    });
};

/**
 * Task: push
 * デフォルトのScratchOrgにソースコードをプッシュする
 */
gulp.task('push', () => push());

const push = () => sfdx.source.push({quiet: false});

/**
 * Task: pull
 * デフォルトのScratchOrgからソースコードを取得する
 */
gulp.task('pull', () => pull());

const pull = () => sfdx.source.pull({quiet: false});

/**
 * Task: import
 * ScratchOrgにサンプルデータを作成する
 */
gulp.task('import', () => importData());

const importData = () => sfdx.data.treeImport({
    sobjecttreefiles: "./data/sample-account.json",
    quiet: false
});

/**
 * Task: open
 * ScratchOrgをブラウザで開く
 */
gulp.task('open', () => open());

const open = () => sfdx.org.open({quiet: false});

/**
 * Task: list
 * 組織の一覧を表示する
 */
gulp.task('list', () => list({quiet: false}));

/**
 * Task: init
 * ScratchOrgの作成、ソースコードのプッシュ、サンプルデータのインポートを行う
 */
gulp.task('init', () => {
    runSeq('create', 'push', 'import', () => open());
});

/**
 * Task: runTests
 * すべてのApexテストを実行する。
 */
gulp.task('runTests', () => runTests());

const runTests = () => {
    return sfdx.apex.testRun({
        'resultformat': 'human',
        'quiet': false
    }).then(function(results){
        if(results.summary.outcome !== 'Passed') {
            throw new gulputil.PluginError('Test Run', {
                message: 'Tests are failing'
            });
        }
    });
};

/**
 * Task: watch
 * ファイル変更を監視して操作を行う
 * ・ .page .css .cls ファイルが変更された場合、ScratchOrgにプッシュする。
 * ・ Apexのテストクラス(*Text.cls) が変更された場合、プッシュ後にテストを実行する。
 */
gulp.task('watch', () => {
    gulp.watch( ['force-app/**/*', '!force-app/**/*Test.cls'], ['push'] );
    gulp.watch( ['force-app/**/*Test.cls'], () => push().then(d => runTests()) );

    pollPull();
});

const pollPull = () => {
    fancyLog('Checking dev hub for changes...');
    sfdx.source.pull({quiet:false}).then(result => {
        if (result.length !== 0) {
            notifier.notify({
                title: "Pulled Source",
                message: "Change File(s)\n" + result.map(o => o.filePath).join("\n")
            });
        }
        setTimeout(pollPull, 10000);
    });
};

