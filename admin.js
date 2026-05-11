 // admin.js

import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =====================
// AUTH ADMIN / SUPERADMIN
// =====================

let currentRole = "user";

onAuthStateChanged(auth, async(user)=>{

  if(!user){
    window.location.href = "index.html";
    return;
  }

  try{

    const userRef =
      doc(db,"users",user.uid);

    const userSnap =
      await getDoc(userRef);

    if(!userSnap.exists()){
      window.location.href = "index.html";
      return;
    }

    const userData =
      userSnap.data();

    currentRole =
      userData.role || "user";

    // ✅ ADMIN + SUPERADMIN
    const isAdmin =
      currentRole === "admin" ||
      currentRole === "superadmin";

    if(!isAdmin){

      alert("Accès refusé");

      window.location.href =
        "index.html";

      return;
    }

    // PHOTO ADMIN
    document.getElementById("adminProfile").src =
      userData.profileImage ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    // TITLE
    if(currentRole === "superadmin"){

      document.title =
        "SuperAdmin Dashboard";

    }

    // LOAD DATA
    await loadStats();

    await loadUsers();

    await loadPosts();

  }catch(error){

    console.log(error);

    alert("Erreur admin");
  }

});

// =====================
// LOGOUT
// =====================

window.logoutAdmin = async function(){

  try{

    await signOut(auth);

    window.location.href =
      "index.html";

  }catch(error){

    console.log(error);
  }
};

// =====================
// STATS
// =====================

async function loadStats(){

  try{

    const users =
      await getDocs(collection(db,"users"));

    const posts =
      await getDocs(collection(db,"posts"));

    const comments =
      await getDocs(collection(db,"comments"));

    const likes =
      await getDocs(collection(db,"postLikes"));

    document.getElementById("usersCount").innerText =
      users.size;

    document.getElementById("postsCount").innerText =
      posts.size;

    document.getElementById("commentsCount").innerText =
      comments.size;

    document.getElementById("likesCount").innerText =
      likes.size;

  }catch(error){

    console.log(error);
  }
}

// =====================
// USERS
// =====================

async function loadUsers(){

  try{

    const snapshot =
      await getDocs(collection(db,"users"));

    let html = "";

    snapshot.forEach((docSnap)=>{

      const user = docSnap.data();

      html += `

      <div class="admin-user-card">

        <div class="admin-user-left">

          <img
            src="${
              user.profileImage ||
              'https://cdn-icons-png.flaticon.com/512/149/149071.png'
            }"
            class="admin-user-img"
          >

          <div>

            <div class="admin-user-name">

              ${user.username || "Utilisateur"}

              ${
                user.role === "superadmin"
                ?
                " 👑"
                :
                ""
              }

            </div>

            <div class="admin-user-email">
              ${user.email || ""}
            </div>

            <div style="
              margin-top:5px;
              font-size:13px;
              color:gray;
            ">
              Role :
              ${user.role || "user"}
            </div>

          </div>

        </div>

        <div class="admin-actions">

          ${
            user.role !== "superadmin"
            ?
            `
            ${
              user.banned
              ?
              `
              <button
              class="admin-btn unban-btn"
              onclick="unbanUser('${docSnap.id}')">

                Débannir

              </button>
              `
              :
              `
              <button
              class="admin-btn ban-btn"
              onclick="banUser('${docSnap.id}')">

                Bannir

              </button>
              `
            }

            <button
            class="admin-btn delete-btn"
            onclick="deleteUser('${docSnap.id}')">

              Supprimer

            </button>
            `
            :
            `
            <div style="
              color:#1877f2;
              font-weight:bold;
            ">
              SUPERADMIN
            </div>
            `
          }

        </div>

      </div>

      `;
    });

    document.getElementById("usersList").innerHTML =
      html;

  }catch(error){

    console.log(error);
  }
}

// =====================
// POSTS
// =====================

async function loadPosts(){

  try{

    const snapshot =
      await getDocs(collection(db,"posts"));

    let html = "";

    snapshot.forEach((docSnap)=>{

      const post = docSnap.data();

      html += `

      <div class="admin-post-card">

        <div class="admin-post-user">

          <img
            src="${
              post.profileImage ||
              'https://cdn-icons-png.flaticon.com/512/149/149071.png'
            }"
            class="admin-post-avatar"
          >

          <strong>
            ${post.username || "Utilisateur"}
          </strong>

        </div>

        <div class="admin-post-question">
          ${post.question || ""}
        </div>

        <div class="admin-post-images">

      `;

      if(post.options){

        post.options.forEach((option)=>{

          if(option.imageUrl){

            html += `

            <img src="${option.imageUrl}">

            `;
          }

        });

      }

      html += `

        </div>

        <div style="
          margin-top:10px;
          margin-bottom:10px;
          font-size:14px;
          color:gray;
        ">
          👍 ${post.likes || 0} likes
        </div>

        <button
        class="admin-btn delete-btn"
        onclick="deletePost('${docSnap.id}')">

          Supprimer post

        </button>

      </div>

      `;
    });

    document.getElementById("postsList").innerHTML =
      html;

  }catch(error){

    console.log(error);
  }
}

// =====================
// BAN USER
// =====================

window.banUser = async function(uid){

  try{

    if(currentRole !== "superadmin"){

      alert(
        "Seul le superadmin peut bannir"
      );

      return;
    }

    await updateDoc(doc(db,"users",uid),{
      banned:true
    });

    await loadUsers();

  }catch(error){

    console.log(error);
  }
};

// =====================
// UNBAN USER
// =====================

window.unbanUser = async function(uid){

  try{

    if(currentRole !== "superadmin"){

      alert(
        "Seul le superadmin peut débannir"
      );

      return;
    }

    await updateDoc(doc(db,"users",uid),{
      banned:false
    });

    await loadUsers();

  }catch(error){

    console.log(error);
  }
};

// =====================
// DELETE USER
// =====================

window.deleteUser = async function(uid){

  try{

    if(currentRole !== "superadmin"){

      alert(
        "Seul le superadmin peut supprimer"
      );

      return;
    }

    const confirmDelete =
      confirm("Supprimer utilisateur ?");

    if(!confirmDelete) return;

    await deleteDoc(doc(db,"users",uid));

    await loadUsers();

    await loadStats();

  }catch(error){

    console.log(error);
  }
};

// =====================
// DELETE POST
// =====================

window.deletePost = async function(postId){

  try{

    const confirmDelete =
      confirm("Supprimer post ?");

    if(!confirmDelete) return;

    await deleteDoc(doc(db,"posts",postId));

    await loadPosts();

    await loadStats();

  }catch(error){

    console.log(error);
  }
};
