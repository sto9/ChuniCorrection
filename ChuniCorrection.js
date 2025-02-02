let all_music_data = [];

async function loadAllMusicsData() {
    const URL = "https://api.chunirec.net/2.0/music/showall.json?region=jp2&token=0cc61074c6f6ccf038b3c62be917be3ef317458be49bd3cd68c78a80b4d024b144db12e7f941a8c043f3ac8b4b0c610740e8960baf53f5469de414d6588fa6b5";
    const res = await fetch(URL);
    all_music_data = await res.json();
}

// クッキーを読み込み、設定を反映
function loadCookie() {
    // 後で書く
}

// 設定を保存
function saveCookie() {
    // 後で書く
}

// 設定を初期化
function initOption() {

}

// const DIFFS = ["BAS", "ADV", "EXP", "MAS", "ULT"];
const DIFFS = ["MAS", "ULT"];
const DIFFS_OR_EMPTY = ["MAS", "ULT", ""];
const SYMBOL_TITLE = "\\{Title}";
const SYMBOL_LEVEL = "\\{Level}";
const SYMBOL_DIFF_UPPER = "\\{DIFF}";
const SYMBOL_DIFF_MID = "\\{Diff}";
const SYMBOL_DIFF_BEGIN = "\\{DiffBegin}";
const SYMBOL_DIFF_END = "\\{DiffEnd}";


function isMatchSymbol(s, i, symbol) {
    return i + symbol.length <= s.length && s.substr(i, symbol.length) === symbol;
}

const INSERT_COST = 1;
const DELETE_COST = 1;
const CHANGE_COST = 2;

// 編集距離
function calcDiffScore(input_sentence, target_sentence) {
    const n = input_sentence.length;
    const m = target_sentence.length;
    let dp = new Array(n + 1).fill(0).map(() => new Array(m + 1).fill(0));
    for (let i = 0; i <= n; i++) dp[i][0] = i * INSERT_COST;
    for (let j = 0; j <= m; j++) dp[0][j] = j * INSERT_COST;
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            let D = dp[i - 1][j] + DELETE_COST;
            let I = dp[i][j - 1] + INSERT_COST;
            let C = dp[i - 1][j - 1] + (input_sentence[i - 1] !== target_sentence[j - 1] ? CHANGE_COST : 0);
            dp[i][j] = Math.min(D, I, C);
        }
    }
    return dp[n][m];
}

function getTargetSentence(data, format, diff) {
    let target_sentence = "";
    let diff_skip = false;
    for (let i = 0; i < format.length;) {
        if (format[i] == "\\") {
            if (isMatchSymbol(format, i, SYMBOL_TITLE)) {
                target_sentence += data["meta"]["title"];
                i += SYMBOL_TITLE.length;
            } else if (isMatchSymbol(format, i, SYMBOL_DIFF_BEGIN)) {
                if (diff === "") {
                    diff_skip = true;
                }
                i += SYMBOL_DIFF_BEGIN.length;
            } else if (isMatchSymbol(format, i, SYMBOL_DIFF_END)) {
                if (diff === "") {
                    diff_skip = false;
                }
                i += SYMBOL_DIFF_END.length;
            }
            else if (isMatchSymbol(format, i, SYMBOL_LEVEL)) {
                if (diff !== "") {
                    let level = String(data["data"][diff]["level"]);
                    if (level.slice(-2) === ".5") {
                        level = level.slice(0, -2) + "+";
                    }
                    target_sentence += level;
                }
                i += SYMBOL_LEVEL.length;
            } else if (isMatchSymbol(format, i, SYMBOL_DIFF_UPPER)) {
                if (!diff_skip) {
                    target_sentence += diff;
                }
                i += SYMBOL_DIFF_UPPER.length;
            } else if (isMatchSymbol(format, i, SYMBOL_DIFF_MID)) {
                if (!diff_skip) {
                    // 先頭以外小文字
                    target_sentence += diff[0] + diff.slice(1).toLowerCase();
                }
                i += SYMBOL_DIFF_MID.length;
            } else {
                // エラー
                throw new Error("Invalid format");
            }
        } else {
            if (!diff_skip) {
                target_sentence += format[i];
            }
            i++;
        }
    }
    console.log(target_sentence);
    return target_sentence;
}

function getMostSimilarSentence(sentence, musics, format) {
    let min_score = 1000000;
    let most_similar_sentence = "";
    for (let data of all_music_data) {
        for (let diff of DIFFS_OR_EMPTY) {
            if (diff !== "" && !data["data"].hasOwnProperty(diff)) {
                continue;
            }
            if (data["data"].hasOwnProperty("WE")) {
                continue;
            }

            let target_sentence = getTargetSentence(data, format, diff);
            let score = calcDiffScore(sentence, target_sentence);
            if (score < min_score) {
                min_score = score;
                if(diff === ""){
                    // MAS にする
                    most_similar_sentence = getTargetSentence(data, format, "MAS");
                }else{
                    most_similar_sentence = target_sentence;
                }
                
            }
        }
    }
    return most_similar_sentence;
}

function init() {
    if (all_music_data.length === 0) {
        loadAllMusicsData();
    }
    let sentence = document.getElementById('input').value;
    let format = document.getElementById('music_and_diff_format').value;
    let most_similar_sentence = getMostSimilarSentence(sentence, all_music_data, format);
    document.getElementById('test').textContent = most_similar_sentence;
    console.log(most_similar_sentence);
}



