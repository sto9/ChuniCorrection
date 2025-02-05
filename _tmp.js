let user_id = "";
let records;
let records_all; // 未プレイを含む
let musics_all;

async function loadAllMusicsData() {
    const URL = "https://api.chunirec.net/2.0/music/showall.json?region=jp2&token=0cc61074c6f6ccf038b3c62be917be3ef317458be49bd3cd68c78a80b4d024b144db12e7f941a8c043f3ac8b4b0c610740e8960baf53f5469de414d6588fa6b5";
    const res = await fetch(URL);
    musics_all = await res.json();
}

const list_input_value = ['user_id', 'level_lower', 'level_upper', 'level_lower_const', 'level_upper_const', 'unachieved', 'achieved', 'score_lower', 'score_upper', 'display_number'];
const list_input_checked = ['select-const', 'ultima', 'genre_pa', 'genre_nico', 'genre_toho', 'genre_var', 'genre_iro', 'genre_geki', 'genre_ori', 'exclude_unplayed'];

// 旧バージョンの Cookie を新しくする
function renewCookie() {
    const achieve_list = ["AJC", "99AJ", "AJ", "SSS+", "SSS", "all"];
    for (let achieve of achieve_list) {
        let cookie;
        if (cookie = Cookies.get("radio_" + achieve)) {
            Cookies.remove("radio_" + achieve);
            if (cookie === "on")
                Cookies.set("unachieved", "notdone_" + achieve, { expires: 60 });
        }
    }
}

// クッキーを読み込み、設定を反映
function loadCookie() {
    for (let target of list_input_value) {
        let cookie;
        if (cookie = Cookies.get(target))
            document.getElementById(target).value = cookie;
    }
    for (let target of list_input_checked) {
        let cookie;
        if (cookie = Cookies.get(target))
            document.getElementById(target).checked = (cookie === 'on');
    }
    let disp = ["lower-notconst-block", "upper-notconst-block"];
    let hide = ["lower-const-block", "upper-const-block"];
    if (document.getElementById('select-const').checked)
        [disp, hide] = [hide, disp];
    for (let target of disp) document.getElementById(target).classList.remove("d-none");
    for (let target of hide) document.getElementById(target).classList.add("d-none");
}
// 設定を保存
function saveCookie() {
    for (let target of list_input_value) {
        Cookies.set(target, document.getElementById(target).value, { expires: 60 });
    }
    for (let target of list_input_checked) {
        Cookies.set(target, (document.getElementById(target).checked ? 'on' : 'off'), { expires: 60 });
    }
}
// 設定を初期化
function initOption() {
    for (let target of list_input_value) {
        if (target === "user_id") continue;
        Cookies.remove(target);
    }
    for (let target of list_input_checked) {
        Cookies.remove(target);
    }
    location.reload();
}
function initOptionConfirm() {
    if (window.confirm('初期設定に戻しますか？'))
        initOption();
}

// 前と同じ ID なら呼ばない
// 成功したかどうかを返す
async function callApi() {
    if (user_id !== "" && user_id === document.getElementById('user_id').value) return true;
    if (document.getElementById('user_id').value === "") {
        document.getElementById('user_id_error').innerHTML = "<b>ユーザー ID を入力してください。</b>";
        return false;
    }
    const BASE_URL = "https://api.chunirec.net/2.0/records/showall.json?region=jp2&token=0cc61074c6f6ccf038b3c62be917be3ef317458be49bd3cd68c78a80b4d024b144db12e7f941a8c043f3ac8b4b0c610740e8960baf53f5469de414d6588fa6b5&user_name=";
    const URL = BASE_URL + document.getElementById('user_id').value;
    const res = await fetch(URL);
    if (!res.ok) {
        document.getElementById('user_id_error').innerHTML = "<b>不正なユーザー ID です。</b>";
        user_id = "";
        return false;
    }
    document.getElementById('user_id_error').innerHTML = "";
    const json = await res.json();
    records = await json["records"];
    user_id = document.getElementById('user_id').value;
    return true;
}

// 入力が数値かチェック
function isValidInputNumber() {
    let valid = true;
    // 譜面定数
    if (document.getElementById('select-const').checked) {
        let lower = document.getElementById('level_lower_const').value;
        let upper = document.getElementById('level_upper_const').value;
        if (lower !== "" && upper !== "" && !isNaN(lower) && !isNaN(upper)) {
            document.getElementById('const_error').innerHTML = "";
        } else {
            document.getElementById('const_error').innerHTML = "<b>数値を入力してください。</b>";
            valid = false;
        }
    }
    // スコア
    let lower = document.getElementById('score_lower').value;
    let upper = document.getElementById('score_upper').value;
    if ((lower === "" || !isNaN(lower)) && (upper === "" || !isNaN(upper))) {
        document.getElementById('score_error').innerHTML = "";
    } else {
        document.getElementById('score_error').innerHTML = "<b>数値を入力してください。</b>";
        valid = false;
    }

    return valid;
}

function genre_to_id(genre) {
    if (genre === "POPS&ANIME") return "genre_pa";
    if (genre === "niconico") return "genre_nico";
    if (genre === "東方Project") return "genre_toho";
    if (genre === "VARIETY") return "genre_var";
    if (genre === "イロドリミドリ") return "genre_iro";
    if (genre === "ゲキマイ") return "genre_geki";
    if (genre === "ORIGINAL") return "genre_ori";
    return ""; // WE など
}

function isValidRecord(record) {
    // MASTER, ULTIMA
    let ultima = document.getElementById('ultima').checked;
    if (!(record["diff"] === "MAS" || (record["diff"] === "ULT" && ultima))) return false;
    // レベル
    let lower, upper, level_target;
    if (document.getElementById('select-const').checked) {
        lower = document.getElementById('level_lower_const').value;
        upper = document.getElementById('level_upper_const').value;
        level_target = record["const"];
    } else {
        lower = document.getElementById('level_lower').value;
        upper = document.getElementById('level_upper').value;
        level_target = record["level"];
    }
    if (level_target < lower || level_target > upper) return false;
    // ジャンル
    let genre_id = genre_to_id(record["genre"]);
    if (genre_id === "" || !document.getElementById(genre_id).checked) return false;
    // 未達成・達成
    const achieved_and_unachieved = [document.getElementById('achieved').value, document.getElementById('unachieved').value];
    const prefix = ["done_", "notdone_"];
    for (let au = 0; au < 2; au++) {
        let val = achieved_and_unachieved[au];
        let NG;
        if (val === prefix[au] + "AJC") {
            NG = (record["score"] == "1010000");
        } else if (val === prefix[au] + "99AJ") {
            NG = (record["is_alljustice"] && record["score"] >= 1009900);
        } else if (val === prefix[au] + "AJ") {
            NG = (record["is_alljustice"]);
        } else if (val === prefix[au] + "SSS+") {
            NG = (record["score"] >= 1009000);
        } else if (val === prefix[au] + "SSS") {
            NG = (record["score"] >= 1007500);
        } else if (val === prefix[au] + "SS+") {
            NG = (record["score"] >= 1005000);
        } else if (val === prefix[au] + "SS") {
            NG = (record["score"] >= 1000000);
        } else if (val === prefix[au] + "all") {
            continue;
        } else {
            console.assert(false);
        }
        if (au === 0) NG = !NG;
        if (NG) return false;
    }
    // スコア指定
    let score_lower = document.getElementById('score_lower').value;
    if (score_lower !== "" && record["score"] < score_lower) return false;
    let score_upper = document.getElementById('score_upper').value;
    if (score_upper !== "" && record["score"] > score_upper) return false;

    return true;
}

let tweet_sentence;

function addTableAndTweet(record) {
    let level = String(record["level"]);
    if (level.length > 2)
        level = level.slice(0, 2) + "+";
    let lamp = "-";
    if (record["is_alljustice"]) lamp = "AJ"
    else if (record["is_fullcombo"]) lamp = "FC"
    let humen_url = "https://www.sdvx.in/chunithm/sort/" + level + ".htm";
    let new_HTML = "<tr>";
    new_HTML += '<td class="text-break">' + record["title"] + "</td>";
    new_HTML += '<td>' + record["diff"] + " " + '<a style="text-decoration:none;" target="_blank" rel="noopener noreferrer" href="' + humen_url + '">';
    if (document.getElementById('select-const').checked)
        new_HTML += record["const"].toFixed(1) + "</a></td>";
    else
        new_HTML += level + "</a></td>";
    new_HTML += '<td style="text-align:center">' + record["genre"] + "</td>";
    new_HTML += '<td style="text-align:right">' + record["score"] + "</td>";
    new_HTML += '<td style="text-align:center">' + lamp + "</td>";
    new_HTML += "</tr>";
    tbody.insertAdjacentHTML('beforeend', new_HTML);

    tweet_sentence += "・" + record["title"] + " [" + record["diff"] + " " + level + "]\n";
}

function setAllRecords() {
    let played_music_id = new Set();
    for (let i = 0; i < records.length; i++) {
        played_music_id.add(records[i]["id"] + records[i]["diff"]);
    }
    records_all = records.slice();
    for (let i = 0; i < musics_all.length; i++) {
        let id = musics_all[i]["meta"]["id"];
        for (let diff of ["MAS", "ULT"]) {
            if (diff in musics_all[i]["data"]) {
                if (!played_music_id.has(id + diff)) {
                    let new_rec = { ...musics_all[i]["meta"], ...musics_all[i]["data"][diff] };
                    new_rec["score"] = 0;
                    new_rec["is_fullcombo"] = false;
                    new_rec["is_alljustice"] = false;
                    new_rec["diff"] = diff;
                    records_all.push(new_rec);
                }
            }
        }
    }
}

function deleteTable() {
    let thead = document.getElementById("thead");
    let tbody = document.getElementById("tbody");
    while (thead.firstChild) thead.removeChild(thead.firstChild);
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    let tweet = document.getElementById("tweet");
    while (tweet.firstChild) tweet.removeChild(tweet.firstChild);
    let music_count_sentence = document.getElementById("music_count_sentence");
    music_count_sentence.innerHTML = "";
}

function setTable() {
    deleteTable();

    let th = '<tr><th scope="col">曲名</th>';
    th += '<th scope="col" style="width:4.9em; min-width:4.9em">難易度</th>';
    th += '<th scope="col" style="width:5.5em; min-width:5.5em">ジャンル</th>';
    th += '<th scope="col" style="width:4.4em; min-width:4.4em">スコア</th>';
    th += '<th scope="col" style="width:2em; min-width:2em">AJ<br>FC</th></td>';
    thead.insertAdjacentHTML('beforeend', th);
    tweet_sentence = "今日の課題曲はこれ！ #chunifil\n";

    let display_number = document.getElementById('display_number').value;
    let displayed_count = 0;
    let valid_music_count = 0;

    if (document.getElementById('exclude_unplayed').checked) {
        let idx = [...Array(records.length).keys()];
        // shuffle
        for (let i = idx.length - 1; i > 0; i--) {
            let k = Math.floor(Math.random() * i);
            [idx[i], idx[k]] = [idx[k], idx[i]];
        }
        for (let i = 0; i < idx.length; i++) {
            if (!isValidRecord(records[idx[i]])) continue;
            valid_music_count++;
            if (displayed_count == display_number) continue;
            displayed_count++;
            addTableAndTweet(records[idx[i]]);
        }
    } else {
        setAllRecords();
        let idx = [...Array(records_all.length).keys()];
        // shuffle
        for (let i = idx.length - 1; i > 0; i--) {
            let k = Math.floor(Math.random() * i);
            [idx[i], idx[k]] = [idx[k], idx[i]];
        }
        for (let i = 0; i < idx.length; i++) {
            if (!isValidRecord(records_all[idx[i]])) continue;
            valid_music_count++;
            if (displayed_count == display_number) continue;
            displayed_count++;
            addTableAndTweet(records_all[idx[i]]);
        }
    }
    let music_count_sentence = document.getElementById("music_count_sentence");
    music_count_sentence.innerHTML = "<b>" + valid_music_count + "</b> 曲中 ";
    music_count_sentence.innerHTML += displayed_count + " 曲を表示"

    if (1 <= displayed_count && displayed_count <= 5) {
        setTweet();
    } else {
        let tweet = document.getElementById("tweet");
        while (tweet.firstChild) tweet.removeChild(tweet.firstChild);
    }
}

function setTweet() {
    console.log("setTweet invoked");
    let tweet = document.getElementById("tweet");
    while (tweet.firstChild) tweet.removeChild(tweet.firstChild);
    let a = document.createElement("a");
    a.setAttribute("href", "https://twitter.com/share?ref_src=twsrc%5Etfw");
    a.setAttribute("class", "twitter-share-button");
    a.setAttribute("data-show-count", "false");
    a.setAttribute("data-text", tweet_sentence);
    a.setAttribute("data-url", "https://sto9.github.io/ChuniRandomTool/chunithm_random.html");
    tweet.appendChild(a);
    let script = document.createElement("script");
    script.async = "true";
    script.src = "https://platform.twitter.com/widgets.js";
    script.charset = "utf-8";
    tweet.appendChild(script);
}

async function loadTable() {
    if (!(await callApi())) return;
    if (!isValidInputNumber()) return;
    setTable();
    saveCookie()
}

function switchConst() {
    for (let name of ["lower-notconst-block", "upper-notconst-block", "lower-const-block", "upper-const-block"]) {
        document.getElementById(name).classList.toggle("d-none");
    }
}