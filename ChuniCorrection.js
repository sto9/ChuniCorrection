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

const DIFFS = ["EXP", "MAS", "ULT"];
const DIFFS_OR_EMPTY = ["EXP", "MAS", "ULT", ""];
const SYMBOL_TITLE = "\\{Title}";
const SYMBOL_LEVEL = "\\{Level}";
const SYMBOL_DIFF_UPPER = "\\{DIFF}";
const SYMBOL_DIFF_MID = "\\{Diff}";
const SYMBOL_DIFF_BEGIN = "\\{DiffBegin}";
const SYMBOL_DIFF_END = "\\{DiffEnd}";

const ULT_LIKE = ["ult"];
const MAS_LIKE = ["mas"];
const EXP_LIKE = ["exp"];

// const special_regex = /[ 　、。,.\[\]\'\"「」()（）《》【】\-～…・:!?！？”]/g;
const special_regex = /[ 　、。,.［］\[\]'"「」()（）《》【】\-～…・:!?！？+]/g;
const space_bracket_regex = /[ 　［］\[\]()（）【】]/g;
const zenkaku_regex = /^[^\x01-\x7E\uFF61-\uFF9F]+$/;

function isMatchSymbol(s, i, symbol) {
    return i + symbol.length <= s.length && s.substr(i, symbol.length) === symbol;
}

function charCost(c) {
    if (space_bracket_regex.test(c)) {
        return 1;
    } else if (special_regex.test(c)) {
        return 2;
    } else if (zenkaku_regex.test(c)) {
        return 20;
    } else {
        return 15;
    }
}

// 編集距離
function calcDiffScore(s, t) {
    const n = s.length;
    const m = t.length;
    let cs = [];
    let ct = [];
    for (let i = 0; i < n; i++)
        cs.push(charCost(s[i]));
    for (let i = 0; i < m; i++)
        ct.push(charCost(t[i]));

    let dp = new Array(n + 1).fill(0).map(() => new Array(m + 1).fill(0));
    for (let i = 0; i < n; i++) dp[i + 1][0] = dp[i][0] + cs[i];
    for (let j = 0; j < m; j++) dp[0][j + 1] = dp[0][j] + ct[j];
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            let D = dp[i - 1][j] + cs[i - 1] * 2;
            let I = dp[i][j - 1] + ct[j - 1];
            let C = dp[i - 1][j - 1];
            if (s[i - 1] !== t[j - 1]) {
                C += Math.max(cs[i - 1], ct[j - 1]);
            }
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
    return target_sentence;
}

function getMostLikelyDiff(sentence, data) {
    let lower_title = sentence.toLowerCase();
    let candidate_diff_and_pos = [];
    for (let ult_like of ULT_LIKE) {
        let pos = lower_title.indexOf(ult_like);
        if (pos !== -1) {
            candidate_diff_and_pos.push(["ULT", pos]);
        }
    }
    for (let mas_like of MAS_LIKE) {
        let pos = lower_title.indexOf(mas_like);
        if (pos !== -1) {
            candidate_diff_and_pos.push(["MAS", pos]);
        }
    }
    for (let exp_like of EXP_LIKE) {
        let pos = lower_title.indexOf(exp_like);
        if (pos !== -1) {
            candidate_diff_and_pos.push(["EXP", pos]);
        }
    }

    if (candidate_diff_and_pos.length !== 0) {
        // 一番右にあるものを選ぶ
        candidate_diff_and_pos.sort((a, b) => b[1] - a[1]);
        let res = candidate_diff_and_pos[0][0];
        if (data["data"].hasOwnProperty(res)) {
            return res;
        }
    }

    // 存在しない難易度なら，最も高い難易度を選ぶ
    if (data["data"].hasOwnProperty("ULT")) {
        return "ULT";
    }
    return "MAS";
}

function getMostSimilarSentence(sentence, format) {
    let min_score = 1000000;
    let most_similar_data;
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

            // let sentence_lower = sentence.toLowerCase();
            // let target_sentence_lower = target_sentence.toLowerCase();
            // // let score = calcDiffScore(sentence_lower, target_sentence_lower);
            // score += calcDiffScore(sentence_lower, target_sentence_lower);

            // let sentence_nospecial = sentence.replace(special_regex, "");
            // let target_sentence_nospecial = target_sentence.replace(special_regex, "");
            // // score += calcDiffScore(sentence_nospecial, target_sentence_nospecial);
            // // console.log(calcDiffScore(sentence_nospecial, target_sentence_nospecial));

            // let sentence_nospecial_lower = sentence_nospecial.toLowerCase();
            // let target_sentence_nospecial_lower = target_sentence_nospecial.toLowerCase();
            // score += calcDiffScore(sentence_nospecial_lower, target_sentence_nospecial_lower) * 4;

            if (score < min_score) {
                min_score = score;
                most_similar_data = data;
            }

            // console.log(sentence);
            // console.log(target_sentence);
            // console.log(sentence_nospecial_lower);
            // console.log(target_sentence_nospecial_lower);
        }
    }

    // 難易度を推定
    most_like_diff = getMostLikelyDiff(sentence, most_similar_data);
    let most_similar_sentence = getTargetSentence(most_similar_data, format, most_like_diff);
    return most_similar_sentence;
}

function setArrowHtml(sentence, result) {
    let arrows_dom = document.getElementById('arrows');
    if (sentence !== result) {
        let sentence_nospace = sentence.replace(space_bracket_regex, "");
        let result_nospace = result.replace(space_bracket_regex, "");
        if (sentence_nospace === result_nospace) {
            arrows_dom.innerHTML += "►";
        } else {
            arrows_dom.innerHTML += "<font color='red'>►</font>";
        }
    }
    arrows_dom.innerHTML += "<br>";
}

function init() {
    if (all_music_data.length === 0) {
        loadAllMusicsData();
    }
    let sentence_array_origin = String(document.getElementById('input-multi').value);
    let sentence_array = sentence_array_origin.split("\n");
    let format = document.querySelector('input[name="format-example-choice"]:checked')?.value;

    resetResult();
    let output_multi = document.getElementById('output-multi');

    for (let sentence of sentence_array) {
        let result = "";
        if (sentence !== "") {
            result = getMostSimilarSentence(sentence, format);
        }
        output_multi.value += result + "\n";
        setArrowHtml(sentence, result);
    }
    output_multi.value = output_multi.value.slice(0, -1);
    autoExpand(output_multi);
}

function resetResult() {
    let output_multi = document.getElementById('output-multi');
    let arrows_dom = document.getElementById('arrows');
    output_multi.value = "";
    arrows_dom.innerHTML = "";
    autoExpand(output_multi);
}

function deleteResult() {
    let input_multi = document.getElementById('input-multi');
    let output_multi = document.getElementById('output-multi');
    let arrows_dom = document.getElementById('arrows');
    input_multi.value = "";
    output_multi.value = "";
    arrows_dom.innerHTML = "<br><br><br><br>";
    autoExpand(input_multi);
    autoExpand(output_multi);
}

function autoExpand(textarea) {
    textarea.style.height = "auto"; // 高さをリセット
    textarea.style.height = textarea.scrollHeight + "px"; // 必要な高さに調整
}
