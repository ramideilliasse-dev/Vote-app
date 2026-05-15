 import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =====================
// 🔎 SEARCH
// =====================

window.searchContent = async function(){

  try{

    const input =
      document.getElementById("searchInput");

    const results =
      document.getElementById("results");

    const value =
      input.value.toLowerCase().trim();

    if(value.length < 1){

      results.innerHTML = "";

      return;
    }

    let html = "";

    // =====================
    // 👤 USERS
    // =====================

    const usersSnapshot =
      await getDocs(collection(db,"users"));

    usersSnapshot.forEach((docSnap)=>{

      const user =
        docSnap.data();

      const username =
        (user.username || "")
        .toLowerCase();

      if(username.includes(value)){

        html += `

        <div
        class="search-card"
        onclick="openProfile('${user.uid}')"
        >

          <img
          src="${
            user.profileImage ||
            'https://cdn-icons-png.flaticon.com/512/149/149071.png'
          }"
          class="search-avatar"
          >

          <div>

            <div class="search-title">
              ${user.username || "Utilisateur"}
            </div>

            <div class="search-sub">
              👤 Utilisateur
            </div>

          </div>

        </div>

        `;
      }
    });

    // =====================
    // 📄 POSTS
    // =====================

    const postsSnapshot =
      await getDocs(collection(db,"posts"));

    postsSnapshot.forEach((docSnap)=>{

      const post =
        docSnap.data();

      const question =
        (post.question || "")
        .toLowerCase();

      if(question.includes(value)){

        html += `

        <div
        class="search-card"
        onclick="openPost('${docSnap.id}')"
        >

          <img
          src="${
            post.profileImage ||
            'https://cdn-icons-png.flaticon.com/512/149/149071.png'
          }"
          class="search-avatar"
          >

          <div>

            <div class="search-title">
              ${post.question || ""}
            </div>

            <div class="search-sub">
              📄 ${post.username || ""}
            </div>

          </div>

        </div>

        `;
      }
    });

    if(html === ""){

      html = `

      <div class="search-card">
        Aucun résultat
      </div>

      `;
    }

    results.innerHTML = html;

  }catch(error){

    console.log(error);
  }
};

// =====================
// 👤 OPEN PROFILE
// =====================

window.openProfile = function(uid){

  window.location.href =
    "profile.html?user=" + uid;
};

// =====================
// 📄 OPEN POST
// =====================

window.openPost = function(postId){

  window.location.href =
    "post.html?post=" + postId;
};
