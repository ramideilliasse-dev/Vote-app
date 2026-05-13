 import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

async function loadSavedPosts(user){

  const feed =
    document.getElementById("savedFeed");

  const savedSnapshot =
    await getDocs(collection(db,"savedPosts"));

  const postsSnapshot =
    await getDocs(collection(db,"posts"));

  let savedIds = [];

  savedSnapshot.forEach((docSnap)=>{

    const data = docSnap.data();

    if(data.userId === user.uid){

      savedIds.push(data.postId);
    }
  });

  let html = "";

  postsSnapshot.forEach((docSnap)=>{

    const post = docSnap.data();

    if(savedIds.includes(docSnap.id)){

      html += `

      <div class="saved-post">

        <h3>
          ${post.username || "Utilisateur"}
        </h3>

        <p>
          ${post.question || ""}
        </p>

        ${
          post.options?.[0]?.imageUrl
          ?
          `
          <img
            src="${post.options[0].imageUrl}"
            class="saved-image"
          >
          `
          :
          ""
        }

      </div>

      `;
    }
  });

  if(html === ""){

    html = `
    <div class="empty">
      Aucun post enregistré
    </div>
    `;
  }

  feed.innerHTML = html;
}

onAuthStateChanged(auth,(user)=>{

  if(user){

    loadSavedPosts(user);

  }else{

    window.location.href =
      "index.html";
  }
});
