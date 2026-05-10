 import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let isAdmin = false;

// =====================
// 🔐 AUTH
// =====================

window.register = async function () {

  try{

    const email =
      document.getElementById("email").value.trim();

    const password =
      document.getElementById("password").value.trim();

    if(password.length < 6){
      alert("Mot de passe minimum 6 caractères");
      return;
    }

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    const defaultAvatar =
      "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    await setDoc(doc(db, "users", user.uid), {

      uid: user.uid,
      email: user.email,

      username: email.split("@")[0],

      role: "user",

      banned: false,

      profileImage: defaultAvatar,

      coverImage:
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600",

      bio: "Salut 👋",

      followers: 0,

      likes: 0,

      createdAt: serverTimestamp()
    });

    alert("Compte créé !");

  } catch(error){
    alert(error.message);
  }
};

window.login = async function () {

  try{

    const email =
      document.getElementById("email").value.trim();

    const password =
      document.getElementById("password").value.trim();

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    alert("Connecté !");

  } catch(error){
    alert(error.message);
  }
};

// =====================
// 🚪 LOGOUT
// =====================

window.logout = async function () {

  await signOut(auth);

  isAdmin = false;

  const authCard =
    document.getElementById("authCard");

  const mainFeed =
    document.getElementById("mainFeed");

  if(authCard){
    authCard.style.display = "flex";
  }

  if(mainFeed){
    mainFeed.style.display = "none";
  }

  document.getElementById("feed").innerHTML = "";

  alert("Déconnecté !");
};

// =====================
// 🔄 SESSION
// =====================

onAuthStateChanged(auth, async (user) => {

  const authCard =
    document.getElementById("authCard");

  const mainFeed =
    document.getElementById("mainFeed");

  if(user){

    if(authCard){
      authCard.style.display = "none";
    }

    if(mainFeed){
      mainFeed.style.display = "block";
    }

    await loadProfile(user);

    await loadPosts();

    loadNotifications();

  } else {

    if(authCard){
      authCard.style.display = "flex";
    }

    if(mainFeed){
      mainFeed.style.display = "none";
    }

    document.getElementById("feed").innerHTML = "";
  }

});

// =====================
// 🔄 REFRESH FEED
// =====================

window.refreshFeed = async function(){

  await loadPosts();

};

// =====================
// 👤 PROFIL
// =====================

async function loadProfile(user){

  const ref = doc(db, "users", user.uid);

  const snap = await getDoc(ref);

  if(snap.exists()){

    const data = snap.data();

    if(document.getElementById("myProfileImage")){

      document.getElementById("myProfileImage").src =
        data.profileImage ||
        "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    }

    if(document.getElementById("topUsername")){

      document.getElementById("topUsername").innerText =
        data.username;
    }

    if(
      data.role === "admin" &&
      document.getElementById("adminPanel")
    ){

      isAdmin = true;

      document.getElementById("adminPanel").style.display =
        "block";

      loadUsers();
    }
  }
}

// =====================
// 📸 UPLOAD IMAGE
// =====================

async function uploadImage(file){

  if(!file) return "";

  if(file.size > 5000000){

    alert("Image trop lourde");

    return "";
  }

  const formData = new FormData();

  formData.append("image", file);

  const res = await fetch(
    "https://api.imgbb.com/1/upload?key=ba51854ee84cfa7eb88af864a04ac02f",
    {
      method: "POST",
      body: formData
    }
  );

  const data = await res.json();

  return data.data.url;
}

// =====================
// 👑 ADMIN
// =====================

window.deletePost = async function(postId){

  if(!isAdmin){
    alert("Accès refusé");
    return;
  }

  await deleteDoc(doc(db, "posts", postId));

  loadPosts();
};

async function loadUsers(){

  if(!isAdmin) return;

  if(!document.getElementById("userList")) return;

  const snapshot =
    await getDocs(collection(db, "users"));

  let html = "";

  snapshot.forEach((docSnap) => {

    const user = docSnap.data();

    html += `

      <div class="admin-user">

        <img
          src="${
            user.profileImage ||
            'https://cdn-icons-png.flaticon.com/512/149/149071.png'
          }"
          class="admin-user-image"
        >

        <div>
          <div>${user.username}</div>
          <small>${user.email}</small>
        </div>

      </div>

    `;
  });

  document.getElementById("userList").innerHTML =
    html;
}

// =====================
// 🔔 NOTIFICATIONS
// =====================

async function addNotification(
  toUserId,
  fromUserId,
  type
){

  if(toUserId === fromUserId) return;

  await addDoc(
    collection(db, "notifications"),
    {
      toUserId,
      fromUserId,
      type,
      createdAt: serverTimestamp()
    }
  );
}

async function loadNotifications(){

  const user = auth.currentUser;

  if(!user) return;

  const notifBox =
    document.getElementById("notifList");

  if(!notifBox) return;

  const snapshot =
    await getDocs(collection(db, "notifications"));

  let html = "";

  snapshot.forEach((docSnap) => {

    const notif = docSnap.data();

    if(notif.toUserId === user.uid){

      if(notif.type === "like"){
        html += `<p>❤️ Quelqu’un a aimé ton post</p>`;
      }

      if(notif.type === "vote"){
        html += `<p>🗳️ Nouveau vote sur ton post</p>`;
      }

      if(notif.type === "comment"){
        html += `<p>💬 Nouveau commentaire</p>`;
      }
    }
  });

  notifBox.innerHTML =
    html || "<p>Aucune notification</p>";
}

// =====================
// 📱 LOAD POSTS
// =====================

async function loadPosts(){

  const feed =
    document.getElementById("feed");

  if(!feed) return;

  try{

    const snapshot =
      await getDocs(collection(db, "posts"));

    let posts = [];

    snapshot.forEach((docSnap) => {

      const post = docSnap.data();

      posts.push({
        id: docSnap.id,
        ...post
      });

    });

    // TRI PAR DATE
    posts.sort((a,b) => {

      return (
        (b.createdAt?.seconds || 0)
        - (a.createdAt?.seconds || 0)
      );

    });

    let html = "";

    // SI AUCUN POST
    if(posts.length === 0){

      html = `
        <div style="
          background:white;
          padding:30px;
          border-radius:20px;
          text-align:center;
          margin-top:20px;
        ">
          Aucun post publié
        </div>
      `;

      feed.innerHTML = html;

      return;
    }

    // POSTS
    posts.forEach((post) => {

      html += `

      <div class="fb-post">

        <!-- HEADER -->
        <div class="fb-header">

          <div class="fb-user-info">

            <img
              src="${
                post.profileImage ||
                'https://cdn-icons-png.flaticon.com/512/149/149071.png'
              }"
              class="fb-profile"
              onclick="openUserProfile('${post.userId || ""}')"
            >

            <div>

              <div
              class="fb-username"
              onclick="openUserProfile('${post.userId || ""}')">

                ${post.username || "Utilisateur"}

              </div>

              <div class="fb-time">
                Publication
              </div>

            </div>

          </div>

        </div>

        <!-- QUESTION -->
        <div class="fb-question">

          ${post.question || ""}

        </div>

        <!-- OPTIONS -->
        <div class="fb-options">

      `;

      // OPTIONS
      if(post.options && post.options.length > 0){

        post.options.forEach((option, index) => {

          html += `

          <div class="fb-option-card">

            ${
              option.imageUrl
              ?
              `
              <img
                src="${option.imageUrl}"
                class="fb-option-image"
              >
              `
              :
              `
              <div class="fb-empty-image">
                🖼️
              </div>
              `
            }

            <div class="fb-option-name">
              ${option.text || ""}
            </div>

            <button
              class="vote-btn"
              onclick="voteOption('${post.id}', ${index})"
            >
              🗳️ Voter
            </button>

            <div class="vote-count">
              ${option.votes || 0} votes
            </div>

          </div>

          `;
        });

      }

      html += `

        </div>

        <!-- LINE -->
        <div class="fb-line"></div>

        <!-- ACTIONS -->
        <div class="fb-actions">

          <button
          class="fb-action-btn"
          onclick="likePost('${post.id}')">

            👍 J’aime (${post.likes || 0})

          </button>

          <button
          class="fb-action-btn"
          onclick="toggleComments('${post.id}')">

            💬 Commenter

          </button>

          <button
          class="fb-action-btn"
          onclick="sharePost('${post.id}')">

            📤 Partager

          </button>

          ${
            isAdmin
            ?
            `
            <button
            class="fb-action-btn"
            onclick="deletePost('${post.id}')">

              🗑️

            </button>
            `
            :
            ""
          }

        </div>

        <!-- COMMENTS -->
        <div
        class="comments-section"
        id="comments-${post.id}"
        style="display:none;">

          <div id="commentsList-${post.id}"></div>

          <div class="comment-box">

            <input
              type="text"
              id="commentInput-${post.id}"
              placeholder="Écrire un commentaire..."
            >

            <button
            onclick="addComment('${post.id}')">

              Envoyer

            </button>

          </div>

        </div>

      </div>

      `;
    });

    feed.innerHTML = html;

    await loadAllComments();

  } catch(error){

    console.log(error);

    feed.innerHTML = `
      <div style="
        background:white;
        padding:30px;
        border-radius:20px;
        text-align:center;
        margin-top:20px;
      ">
        Erreur chargement posts
      </div>
    `;
  }
}

// =====================
// 💬 COMMENTS
// =====================

window.toggleComments = function(postId){

  const box =
    document.getElementById("comments-" + postId);

  if(box.style.display === "none"){

    box.style.display = "block";

  } else {

    box.style.display = "none";
  }
};

window.addComment = async function(postId){

  const user = auth.currentUser;

  if(!user){

    alert("Connecte-toi");

    return;
 
