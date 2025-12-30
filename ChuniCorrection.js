const VERSION = "1.2.0";

const GAMEMODE_CHUNITHM = 0;
const GAMEMODE_SDVX = 1;
let gamemode = GAMEMODE_CHUNITHM;
let sdvx_last_modified = "";

function switchLayout(direc) {
    if (direc === "yoko") {
        document.getElementById('in-out-yoko').style.display = "flex";
        document.getElementById('in-out-tate').style.display = "none";
        document.getElementById('input-multi-yoko').value = document.getElementById('input-multi-tate').value;
        document.getElementById('output-multi-yoko').value = document.getElementById('output-multi-tate').value;
    } else if (direc === "tate") {
        document.getElementById('in-out-tate').style.display = "block";
        document.getElementById('in-out-yoko').style.display = "none";
        document.getElementById('input-multi-tate').value = document.getElementById('input-multi-yoko').value;
        document.getElementById('output-multi-tate').value = document.getElementById('output-multi-yoko').value;
    } else {
        console.log("switchLayout error");
        console.assert(false);
    }
    autoExpand();
}

function setPlaceholder(format) {
    let data1 = {
        "title": "曲名1",
        "難易度": "レベル"
    };
    let data2 = {
        "title": "曲名2",
        "難易度": "レベル"
    };
    let diff = "難易度";
    let text1 = getTargetSentence(data1, format, diff);
    let text2 = getTargetSentence(data2, format, diff);
    for (let placeholder of document.getElementsByClassName('placeholder')) {
        placeholder.innerHTML = text1 + "<br>" + text2 + "<br>...";
    }
}

// クッキーを読み込み、設定を反映
function loadCookie() {
    let settings_str = Cookies.get('settings');
    if (settings_str === undefined) {
        return;
    }
    let settings = JSON.parse(settings_str);

    switchGamemode(settings["gamemode"]);
    for (let nav of document.getElementsByClassName('gamemode')) {
        if (nav.value === String(settings["gamemode"])) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    }

    for (let choice of document.getElementsByName('format-example-choice')) {
        if (choice.id === settings["format-example-id"]) {
            choice.checked = true;
            setPlaceholder(choice.value);
        } else {
            choice.checked = false;
        }
    }

    if (settings["layout-id"] === "layout-yoko") {
        switchLayout("yoko");
    } else {
        switchLayout("tate");
    }
    for (let choice of document.getElementsByName('layout-choice')) {
        if (choice.id === settings["layout-id"]) {
            choice.checked = true;
        } else {
            choice.checked = false;
        }
    }
}

// 設定を保存
function saveCookie() {
    Cookies.remove('settings');

    let save_json = {
        "version": VERSION,
        "gamemode": gamemode,
        "format-example-id": document.querySelector('input[name="format-example-choice"]:checked').id,
        "layout-id": document.querySelector('input[name="layout-choice"]:checked').id
    };

    let save_str = JSON.stringify(save_json);
    Cookies.set('settings', save_str, { expires: 60 });
}



const DIFFS = [["EXP", "MAS", "ULT"], ["EXH", "MXM", "ULT", "INF", "GRV", "HVN", "VVD", "XCD"]];

function toLongDiff(diff) {
    // if (diff === "EXP") return "expert";
    // if (diff === "MAS") return "master";
    // if (diff === "ULT") return "ultima";
    if (diff === "EXH") return "exhaust";
    if (diff === "MXM") return "maximum";
    if (diff === "ULT") return "ultimate";
    if (diff === "INF") return "infinite";
    if (diff === "GRV") return "gravity";
    if (diff === "HVN") return "heavenly";
    if (diff === "VVD") return "vivid";
    if (diff === "XCD") return "exceed";
    console.log("toLongDiff error");
    console.assert(false);
}
function toShortDiff(diff) {
    // if (diff === "expert") return "EXP";
    // if (diff === "master") return "MAS";
    // if (diff === "ultima") return "ULT";
    if (diff === "exhaust") return "EXH";
    if (diff === "maximum") return "MXM";
    if (diff === "ultimate") return "ULT";
    if (diff === "infinite") return "INF";
    if (diff === "gravity") return "GRV";
    if (diff === "heavenly") return "HVN";
    if (diff === "vivid") return "VVD";
    if (diff === "exceed") return "XCD";
    console.log("toShortDiff error");
    console.assert(false);
}

function switchGamemode(new_gamemode) {
    gamemode = new_gamemode;

    // SDVX更新日時の表示/非表示を切り替え
    const updateNotice = document.getElementById('sdvx-update-notice');
    if (updateNotice) {
        if (gamemode === GAMEMODE_SDVX) {
            updateNotice.style.display = 'block';
            // 更新日時がまだ読み込まれていない場合は読み込む
            if (!sdvx_last_modified) {
                loadSDVXLastModified();
            } else {
                const lastModifiedSpan = document.getElementById('sdvx-last-modified');
                if (lastModifiedSpan) {
                    lastModifiedSpan.textContent = sdvx_last_modified;
                }
            }
        } else {
            updateNotice.style.display = 'none';
        }
    }

    // フォーマットの凡例を変更
    let title = "";
    let diff = "";
    let level = "";
    let data = {};
    if (gamemode === GAMEMODE_CHUNITHM) {
        title = "光線チューニング";
        diff = "MAS";
        level = "12";
    } else if (gamemode === GAMEMODE_SDVX) {
        title = "大宇宙ステージ";
        diff = "GRV";
        level = "19.2";
    }
    data["title"] = title;
    data[diff] = level;
    let format_example_labels = document.getElementsByClassName('format-example-label');
    for (let format_example_label of format_example_labels) {
        const format = document.getElementById(format_example_label.getAttribute("for")).value;
        format_example_label.innerHTML = getTargetSentence(data, format, diff);
    }
}

let all_music_data = [[], []];

// SDVX更新日時のみを読み込む関数
async function loadSDVXLastModified() {
    try {
        let json_data = await fetch("./sdvx_musics.json")
            .then(response => response.json());
        sdvx_last_modified = json_data.last_modified_at || "";

        // 更新日時が読み込まれたので、SDVXページの場合は表示を更新
        if (gamemode === GAMEMODE_SDVX) {
            const lastModifiedSpan = document.getElementById('sdvx-last-modified');
            if (lastModifiedSpan && sdvx_last_modified) {
                lastModifiedSpan.textContent = sdvx_last_modified;
            }
        }
    } catch (error) {
        console.log("Error loading SDVX last modified:", error);
    }
}

async function loadAllMusicsData() {
    if (gamemode === GAMEMODE_CHUNITHM) {
        const URL = "https://api.chunirec.net/2.0/music/showall.json?region=jp2&token=0cc61074c6f6ccf038b3c62be917be3ef317458be49bd3cd68c78a80b4d024b144db12e7f941a8c043f3ac8b4b0c610740e8960baf53f5469de414d6588fa6b5";
        const res = await fetch(URL);
        let musics_json = await res.json();
        for (let data of musics_json) {
            if (Object.keys(data["data"]).includes("WE"))
                continue;
            let exist_diffs = DIFFS[gamemode].filter(diff => Object.keys(data["data"]).includes(diff));
            let diff_json = Object.fromEntries(exist_diffs.map(diff => [diff, String(data["data"][diff]["level"])]));
            for (let diff of exist_diffs) {
                if (diff_json[diff].slice(-2) === ".5") {
                    diff_json[diff] = diff_json[diff].slice(0, -2) + "+";
                }
            }

            all_music_data[gamemode].push({
                title: String(data["meta"]["title"]),
                ...diff_json
            });
        }
    } else if (gamemode === GAMEMODE_SDVX) {
        // ローカルのJSONファイルから楽曲データを読み込む
        let json_data = await fetch("./sdvx_musics.json")
            .then(response => response.json());

        let musics_json = json_data.songs;
        sdvx_last_modified = json_data.last_modified_at || "";  // 更新日時を保存

        // 更新日時が読み込まれたので、SDVXページの場合は表示を更新
        if (gamemode === GAMEMODE_SDVX) {
            const lastModifiedSpan = document.getElementById('sdvx-last-modified');
            if (lastModifiedSpan && sdvx_last_modified) {
                lastModifiedSpan.textContent = sdvx_last_modified;
            }
        }

        // 別名を読み込む
        let alias_json = await fetch("./alias_sdvx.json")
            .then(response => response.json());

        for (let data of musics_json) {
            let exist_diffs = DIFFS[gamemode].filter(diff => Object.keys(data).includes(toLongDiff(diff)));
            let diff_json = Object.fromEntries(exist_diffs.map(diff => [diff, String(data[toLongDiff(diff)]["level"])]));
            let alias = {};
            if (alias_json.hasOwnProperty(data["title"])) {
                alias = { "alias": alias_json[data["title"]] };
            }
            all_music_data[gamemode].push({
                title: String(data["title"]),
                ...diff_json,
                ...alias
            });
        }
    } else {
        console.log("loadAllMusicsData error");
        console.assert(false);
    }
}

const DIFFS_OR_EMPTY = [[...DIFFS[0], ""], [...DIFFS[1], ""]];
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
const special_regex = /[ 　、。,.［］『』\[\]'"「」()（）《》【】〚〛\-～…・:!?！？+]/gu;
const space_bracket_regex = /[ 　［］\[\]()（）【】]/gu;

const kanji_regex = /[\p{sc=Han}]/gu;

function isMatchSymbol(s, i, symbol) {
    return i + symbol.length <= s.length && s.substr(i, symbol.length) === symbol;
}

function charCost(c) {
    return 1;
    // if (space_bracket_regex.test(c)) {
    //     return 1;
    // } else if (special_regex.test(c)) {
    //     return 2;
    // } else if (zenkaku_regex.test(c)) {
    //     return 20;
    // } else if (alphabet_regex.test(c)) {
    //     return 15;
    // } else {
    //     return 10;
    // }
}

// 編集距離
function Levenshtein(s, t) {
    const n = s.length;
    const m = t.length;
    let cs = [];
    let ct = [];
    for (let i = 0; i < n; i++)
        cs.push(charCost(s[i]));
    for (let i = 0; i < m; i++)
        ct.push(charCost(t[i]));

    let dp = new Array(n + 1).fill(0).map(() => new Array(m + 1).fill(0));
    for (let i = 0; i < n; i++) dp[i + 1][0] = dp[i][0] + cs[i] * 2;
    for (let j = 0; j < m; j++) dp[0][j + 1] = dp[0][j] + ct[j];
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            let D = dp[i - 1][j] + cs[i - 1] * 2;
            let I = dp[i][j - 1] + ct[j - 1];
            let C = dp[i - 1][j - 1];
            if (s[i - 1] !== t[j - 1]) {
                C += Math.max(cs[i - 1], ct[j - 1]);
                // if (s[i - 1].toLowerCase() === t[j - 1].toLowerCase()) {
                //     C += 5;
                // } else {
                //     C += Math.max(cs[i - 1], ct[j - 1]);
                // }
            }
            dp[i][j] = Math.min(D, I, C);
        }
    }
    return dp[n][m];
}

function calcIntersection(s, t) {
    function countElements(arr) {
        const count = new Map();
        for (const item of arr) {
            count.set(item, (count.get(item) || 0) + 1);
        }
        return count;
    }
    s_multiset = countElements(s);
    t_multiset = countElements(t);

    let intersection_cnt = 0;
    for (const [key, value1] of s_multiset.entries()) {
        if (t_multiset.has(key)) {
            // 最小の出現回数だけ追加
            const value2 = t_multiset.get(key);
            const minCount = Math.min(value1, value2);
            intersection_cnt += minCount;
        }
    }

    return intersection_cnt;
}

function calcDiffScore(s, t) {
    let score = Levenshtein(s, t);

    let s_lower = s.toLowerCase();
    let t_lower = t.toLowerCase();
    score += Levenshtein(s_lower, t_lower);

    let s_nospecial = s.replace(special_regex, "");
    let t_nospecial = t.replace(special_regex, "");
    score += Levenshtein(s_nospecial, t_nospecial);

    let s_nospecial_lower = s_nospecial.toLowerCase();
    let t_nospecial_lower = t_nospecial.toLowerCase();
    score += Levenshtein(s_nospecial_lower, t_nospecial_lower) * 4;

    let s_only_kanji = s.match(kanji_regex)?.join('') || ''
    let t_only_kanji = t.match(kanji_regex)?.join('') || ''
    let isc_cnt = calcIntersection(s_only_kanji, t_only_kanji);
    score -= isc_cnt * isc_cnt * 100;

    // console.log(s);
    // console.log(t);
    // console.log(s_only_kanji);
    // console.log(t_only_kanji);

    return score;
}

function getTargetSentence(data, format, diff, alias = "") {
    let target_sentence = "";
    let diff_skip = false;
    for (let i = 0; i < format.length;) {
        if (format[i] == "\\") {
            if (isMatchSymbol(format, i, SYMBOL_TITLE)) {
                if (alias === "")
                    target_sentence += data["title"];
                else
                    target_sentence += alias;
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
                    target_sentence += data[diff];
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
    for (let diff of DIFFS[gamemode]) {
        let pos = lower_title.indexOf(diff.toLowerCase());
        if (pos !== -1) {
            candidate_diff_and_pos.push([diff, pos]);
        }
    }

    if (candidate_diff_and_pos.length !== 0) {
        // 一番左にあるものを選ぶ
        // candidate_diff_and_pos.sort((a, b) => b[1] - a[1]); // 右の場合
        candidate_diff_and_pos.sort((a, b) => a[1] - b[1]);
        let res = candidate_diff_and_pos[0][0];
        if (data.hasOwnProperty(res)) {
            return res;
        }
    }

    // レべルの数値を見る
    // 数値と+だけの文字列を取り出す
    let nums = sentence.match(/[０-９0-9+＋]+/g) || [];
    nums = nums.map(num => num.replace("＋", "+"));
    nums = nums.map(num => num.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)))
    // for(let ni = nums.length - 1; ni >= 0; ni--) {
    for (let ni = 0; ni < nums.length; ni++) {
        let num = nums[ni];
        for (let di = DIFFS[gamemode].length - 1; di >= 0; di--) {
            let diff = DIFFS[gamemode][di];
            console.log(diff);
            if (data.hasOwnProperty(diff) && data[diff] === num) {
                return diff;
            }
        }
    }

    // 難易度が見つからない場合、最も高い難易度を選ぶ
    for (let i = DIFFS[gamemode].length - 1; i >= 0; i--) {
        if (data.hasOwnProperty(DIFFS[gamemode][i])) {
            return DIFFS[gamemode][i];
        }
    }
    console.log("getMostLikelyDiff error");
    console.assert(false);
}

function getMostSimilarSentence(sentence, format) {
    let min_score = 1000000;
    let most_similar_data;
    for (let data of all_music_data[gamemode]) {
        for (let diff of DIFFS_OR_EMPTY[gamemode]) {
            if (diff !== "" && !data.hasOwnProperty(diff)) {
                continue;
            }

            let target_sentence = getTargetSentence(data, format, diff);
            let score = calcDiffScore(sentence, target_sentence);
            if (score < min_score) {
                min_score = score;
                most_similar_data = data;
            }

            if (data.hasOwnProperty("alias")) {
                for (let alias of data["alias"]) {
                    let alias_sentence = getTargetSentence(data, format, diff, alias);
                    let alias_score = calcDiffScore(sentence, alias_sentence);
                    if (alias_score < min_score) {
                        min_score = alias_score;
                        most_similar_data = data;
                    }
                }
            }
        }
    }

    // 難易度を推定
    most_like_diff = getMostLikelyDiff(sentence, most_similar_data);
    let most_similar_sentence = getTargetSentence(most_similar_data, format, most_like_diff);
    return most_similar_sentence;
}

function setArrowHtmlSingle(sentence, result) {
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

function setArrowHtml(sentences, results) {
    for (let i = 0; i < sentences.length; i++) {
        setArrowHtmlSingle(sentences[i], results[i]);
    }
    if (sentences.length <= 4) {
        for (let i = sentences.length; i < 4; i++) {
            document.getElementById('arrows').innerHTML += "<br>";
        }
    }
}

async function init() {
    saveCookie();

    let inputs = Array.from(document.querySelectorAll('.input-multi'))
        .filter(el => el.offsetParent !== null);
    console.assert(inputs.length === 1);
    let sentence_array_origin = String(inputs[0].value);
    let sentence_array = sentence_array_origin.split("\n");
    let format = document.querySelector('input[name="format-example-choice"]:checked')?.value;
    resetResult();
    let outputs = Array.from(document.querySelectorAll('.output-multi'));
    for (let output of outputs) {
        output.value = "<Loading...>";
    }

    if (all_music_data[gamemode].length === 0) {
        await loadAllMusicsData();
    }

    let result_array = [];
    for (let sentence of sentence_array) {
        let result = "";
        if (sentence !== "") {
            result = getMostSimilarSentence(sentence, format);
        }
        result_array.push(result);
    }
    for (let output of outputs) {
        output.value = result_array.join("\n");
    }

    setArrowHtml(sentence_array, result_array);
    autoExpand();
}

function resetResult() {
    let output_tmp = Array.from(document.querySelectorAll('.output-multi'))
        .filter(el => el.offsetParent !== null);
    console.assert(output_tmp.length === 1);
    let output_multi = output_tmp[0];
    output_multi.value = "";
    autoExpand();

    let arrows_dom = document.getElementById('arrows');
    arrows_dom.innerHTML = "";
}

function deleteResult() {
    let output_multis = document.getElementsByClassName('output-multi');
    for (let output of output_multis) {
        output.value = "";
    }
    let arrows_dom = document.getElementById('arrows');
    arrows_dom.innerHTML = "<br><br><br><br>";
    autoExpand();
}

function autoExpand() {
    let textareas = document.getElementsByClassName('auto-expand');
    let max_height = 0;
    let max_lines = 0;
    for (let textarea of textareas) {
        textarea.style.height = "auto";
        max_height = Math.max(max_height, textarea.scrollHeight);
        let lines = textarea.value.split("\n").length;
        max_lines = Math.max(max_lines, lines);
    }
    for (let textarea of textareas) {
        textarea.style.height = max_height + "px";
    }
    let arrows = document.getElementById('arrows');
    arrows.style.height = max_height + "px";
}
