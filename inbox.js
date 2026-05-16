 import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =====================
// 💬 LOAD INBOX
// =====================

async function loadInbox(){

  try{

    const user =
      auth.currentUser;

    if(!user) return;

    const snapshot =
      await getDocs(
        query(
          collection(db,"messages"),
          orderBy("createdAt","desc")
        )
      );

    let chats = {};

    for(const docSnap of snapshot.docs){

      const msg =
        docSnap.data();

      // MESSAGE ME CONCERNE
      if(
        msg.senderId !== user.uid &&
        msg.receiverId !== user.uid
      ){
        continue;
      }

      // AUTRE UTILISATEUR
      const otherUserId =
        msg.senderId === user.uid
        ? msg.receiverId
        : msg.senderId;

      // ÉVITER DOUBLONS
      if(chats[otherUserId]){
        continue;
      }

      // USER DATA
      const userSnap =
        await getDoc(
          doc(db,"users",otherUserId)
        );

      if(!userSnap.exists()){
        continue;
      }

      const userData =
        userSnap.data();

      chats[otherUserId] = {

        uid:otherUserId,

        username:
          userData.username || "Utilisateur",

        profileImage:
          userData.profileImage ||
          "https://cdn-icons-png.flaticon.com/512/149/149071.png",

        lastMessage:
          msg.text || "",

        unread:
          (
            msg.receiverId === user.uid &&
            msg.seen !== true
          )

      };
    }

    renderInbox(Object.values(chats));

  }catch(error){

    console.log(error);
  }
}

// =====================
// 🖼️ RENDER
// =====================

function renderInbox(chats){

  const inbox =
    document.getElementById("inboxList");

  if(!inbox) return;

  if(chats.length === 0){

    inbox.innerHTML = `

      <div style="
        text-align:center;
        padding:40px;
        color:#65676b;
      ">
        Aucun message
      </div>

    `;

    return;
  }

  let html = "";

  chats.forEach((chat)=>{

    html += `

    <div
      class="chat-item"
      onclick="openChat('${chat.uid}')"
    >

      <img
        src="${chat.profileImage}"
        class="chat-avatar"
      >

      <div>

        <div class="chat-name">
          ${chat.username}
        </div>

        <div class="chat-last">
          ${chat.lastMessage}
        </div>

      </div>

      ${
        chat.unread
        ?
        `
        <div class="unread">
          Nouveau
        </div>
        `
        :
        ""
      }

    </div>

    `;
  });

  inbox.innerHTML = html;
}

// =====================
// 🚀 OPEN CHAT
// =====================

window.openChat = function(userId){

  window.location.href =
    "chat.html?user=" + userId;
};

// =====================
// 🔐 AUTH
// =====================

auth.onAuthStateChanged((user)=>{

  if(user){

    loadInbox();

  }else{

    window.location.href =
      "index.html";
  }
});
