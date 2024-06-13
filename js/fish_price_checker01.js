import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getDatabase, ref, set, remove, onValue } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-database.js";
import axios from "https://cdn.skypack.dev/axios";

// Firebaseプロジェクトの設定情報
const firebaseConfig = {
  apiKey: "ABvtSb9Y",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);

// データベースの参照を取得
const db = getDatabase(app);
const dbRef = ref(db, "fish_price");

// OpenAI APIキー
const OPENAI_API_KEY = ''; // ここにAPIキーを設定

document.addEventListener('DOMContentLoaded', function() {
  const loadingScreen = document.getElementById("loading");

  // ロード画面を表示する関数
  function showLoading() {
    loadingScreen.style.display = "block";
  }

  // ロード画面を非表示にする関数
  function hideLoading() {
    loadingScreen.style.display = "none";
  }

  // 1. Saveクリックイベント
  const saveButton = document.getElementById("save");
  if (saveButton) {
    saveButton.addEventListener('click', async function() {
      const fileInput = document.getElementById("imgFile");
      if (fileInput.files.length === 0) {
        alert("Please select an image file.");
        return;
      }

      const dateValue = $("#date").val();
      const fishValue = $("#fish").val();
      const placeValue = $("#place").val();
      const priceValue = $("#price").val();
      const remarksValue = $("#remarks").val();

      try {
        showLoading(); // ロード画面を表示

        const prompt = `Please explain the cooking method for the fish type "${fishValue}" in simple English.
        If there are the words which are not kind of fishes, you should inform that the user needs to type fish name only.
        If there are the words other than English, you should inform that the user needs to type English only at first.`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.5
        }, {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        const description = response.data.choices[0].message.content;
        console.log(description);
        document.getElementById('description').innerText = description; // HTMLで説明を表示

        // Firebaseにデータを保存
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onloadend = async function() {
          const base64Image = reader.result.split(',')[1]; // Base64エンコードされたデータ部分のみを取得

          const data = {
            date: dateValue,
            fish: fishValue,
            place: placeValue,
            price: priceValue,
            remarks: remarksValue,
            fileInput: base64Image, // 画像データはBase64として保存
            description: description // OpenAIからの説明を保存
          };

          const dateRef = ref(db, `fish_price/${fishValue}/${dateValue}`);
          await set(dateRef, data);
          console.log('Data saved successfully!');
          clearForm();
          hideLoading(); // ロード画面を非表示
        };
        reader.readAsDataURL(file);

      } catch (error) {
        console.error('Error sending request to OpenAI:', error);
        if (error.response) {
          console.log(error.response.data); // サーバーからの具体的なエラーメッセージを表示
        }
        alert('Failed to get a response from OpenAI.');
        hideLoading(); // ロード画面を非表示
      }
    });
  }

  // 入力内容をクリアする関数
  function clearForm() {
    $("#date").val("");
    $("#fish").val("");
    $("#place").val("");
    $("#price").val("");
    $("#remarks").val("");
    $("#imgFile").val("");
    $(".preview").css("background-image", "none"); // プレビュー画像をクリア
    if (window.myLine) {
      window.myLine.destroy(); // グラフエリアをクリア
    }
  }

  // ファイル選択欄の変更イベントに関数を結び付けて、プレビュー表示を行う
  const imgFileInput = document.getElementById("imgFile");
  if (imgFileInput) {
    imgFileInput.addEventListener('change', function () {
      if (!this.files.length) {
        return;
      }

      var file = this.files[0];
      var fr = new FileReader();
      $('.preview').css('background-image', 'none');
      fr.onload = function() {
        $('.preview').css('background-image', 'url(' + fr.result + ')');
      }
      fr.readAsDataURL(file);
    });
  }

  // 2. クリアをクリックした際に入力内容をリセットする
  const emptyButton = document.getElementById("empty");
  if (emptyButton) {
    emptyButton.addEventListener('click', function () {
      $("#date").val("");
      $("#fish").val(""); 
      $("#place").val("");
      $("#price").val(""); 
      $("#remarks").val(""); 
      $("#imgFile").val("");
      $(".preview").css("background-image", "none"); 
      $("#list").empty();
      if (window.myLine) {
        window.myLine.destroy(); // グラフエリアをクリア
      }
    });
  }

  // 4. データベース表示 クリックイベント
  // データベースからデータを取得してHTMLに表示する関数
  function fetchData() {
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Data fetched from database:", data); // デバッグ用のログ
      if (data) {
        displayData(data);
      } else {
        console.log("No data available");
      }
    }, (error) => {
      console.error("Error fetching data:", error);
    });
  }

  // 取得したデータをHTMLに表示する関数
  function displayData(data) {
    const list = $("#list");
    list.empty(); // 既存のリストをクリア

    // データが `fish` キー直下にあると仮定し、その内部のデータをループ処理
    for (const fishKey in data) {
      const fishData = data[fishKey];
      for (const dateKey in fishData) {
        if (fishData.hasOwnProperty(dateKey)) {
          const item = fishData[dateKey];
          if (!item) {
            console.error('Missing data for key:', dateKey);
            continue;  // データが不完全な場合はスキップ
          }
          console.log("Displaying data for item:", item); // デバッグ用のログ
          const html = `
            <div class="grid-item">
                <img src="data:image/jpeg;base64,${item.fileInput}" alt="Image">
                <p>Date: ${item.date}<br>Fish: ${item.fish}<br>Place: ${item.place}<br>Price: ${item.price} Yen/kg<br>Remarks: ${item.remarks}</p>
            </div>
          `;
          list.append(html);
        }
      }
    }
  }

  // データを見るボタンクリック時にデータをフェッチ
  const databaseButton = document.getElementById("database");
  if (databaseButton) {
    databaseButton.addEventListener('click', fetchData);
  }

  // 5. 削除ボタンクリック時にfirebase databaseを削除する
  const clearButton = document.getElementById("clear");
  if (clearButton) {
    clearButton.addEventListener('click', function() {
      const dbRef = ref(db, 'fish_price');
      remove(dbRef)
        .then(() => {
          console.log('Data removed successfully!');
          alert('Data successfully deleted.');
        })
        .catch((error) => {
          console.error('Failed to remove data', error);
          alert('Failed to delete data.');
        });
    });
  }
});
