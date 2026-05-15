 import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =====================
// LOAD CONVERSATIONS
// =====================

onAuthStateChanged(auth, async(user)=>{

  if(!user){

    window.location.href = "index.html";

    return;
  }

  loadConversations(user.uid);

});

async function loadConversations(myUid){

  try{

    const box =
      document.getElementById("conversations");

    const snapshot =
      await getDocs(
        query(
          collection(db,"messages"),
          orderBy("createdAt","desc")
        )
      );

    let usersMap = {};

    snapshot.forEach((docSnap)=>{

      const msg = docSnap.data();

      // MESSAGE ME
      if(
        msg.senderId === myUid ||
        msg.receiverId === myUid
      ){

        const otherUser =
          msg.senderId === myUid
          ? msg.receiverId
          : msg.senderId;

        // ÉVITER DOUBLONS
        if(!usersMap[otherUser]){

          usersMap[otherUser] = {

            username:
              msg.username || "Utilisateur",

            profileImage:
              msg.profileImage ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",

            lastMessage:
              msg.text || ""

          };
        }
      }
    });

    let html = "";

    Object.keys(usersMap).forEach((uid)=>{

      const user = usersMap[uid];

      html += `

      <div
        class="conversation-card"
        onclick="openChat('${uid}')"
      >

        <img
          src="${user.profileImage}"
          class="conversation-image"
        >

        <div>

          <div class="conversation-name">
            ${user.username}
          </div>

          <div class="conversation-last">
            ${user.lastMessage}
          </div>

        </div>

      </div>

      `;
    });

    if(html === ""){

      html = `
      <div class="empty-box">
        Aucun message
      </div>
      `;
    }

    box.innerHTML = html;

  }catch(error){

    console.log(error);
  }
}

// =====================
// OPEN CHAT
// =====================

window.openChat = function(uid){

  window.location.href =
    "chat.html?user=" + uid;
};
