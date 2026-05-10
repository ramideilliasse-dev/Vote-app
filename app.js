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
  serverTimestamp,
  query,
  where
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

    // cacher connexion
    if(authCard){
      authCard.style.display = "none";
    }

    // afficher feed
    if(mainFeed){
      mainFeed.style.display = "block";
    }

    await loadProfile(user);

    await loadPosts();

    loadNotifications();

  } else {

    // afficher connexion
    if(authCard){
      authCard.style.display = "flex";
    }

    // cacher feed
    if(mainFeed){
      mainFeed.style.display = "none";
    }

    // vider feed
    document.getElementById("feed").innerHTML = "";
  }

});

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

    if(data.role === "admin"){

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

  document.getElementById("notifList").innerHTML =
    html || "<p>Aucune notification</p>";
}

// =====================
// 📱 FEED FACEBOOK STYLE
// =====================

// =====================
// 📱 FEED FACEBOOK STYLE
// =====================

async function loadPosts(){

  const snapshot =
    await getDocs(collection(db, "posts"));

  let posts = [];

  for(const docSnap of snapshot.docs){

    const post = docSnap.data();

    posts.push({
      id: docSnap.id,
      ...post
    });
  }

  // TRI PAR DATE
  posts.sort((a,b) => {

    return (b.createdAt?.seconds || 0)
    - (a.createdAt?.seconds || 0);

  });

  let html = "";

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
            onclick="openUserProfile('${post.userId}')"
          >

          <div>

            <div
            class="fb-username"
            onclick="openUserProfile('${post.userId}')">

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

    // =====================
    // OPTIONS
    // =====================

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

  document.getElementById("feed").innerHTML = html;

  // CHARGER COMMENTAIRES
  await loadAllComments();
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
  }

  const input =
    document.getElementById("commentInput-" + postId);

  const text = input.value.trim();

  if(!text){

    return;
  }

  const userSnap =
    await getDoc(doc(db, "users", user.uid));

  const userData = userSnap.data();

  await addDoc(collection(db, "comments"), {

    postId,

    userId: user.uid,

    username: userData.username,

    profileImage: userData.profileImage || "",

    text,

    createdAt: serverTimestamp()
  });

  input.value = "";

  loadComments(postId);
};

async function loadAllComments(){

  const posts =
    await getDocs(collection(db, "posts"));

  posts.forEach((post) => {

    loadComments(post.id);

  });
}

async function loadComments(postId){

  const snapshot =
    await getDocs(collection(db, "comments"));

  let html = "";

  snapshot.forEach((docSnap) => {

    const comment = docSnap.data();

    if(comment.postId === postId){

      html += `

      <div class="comment-item">

        <img
          src="${
            comment.profileImage ||
            'https://cdn-icons-png.flaticon.com/512/149/149071.png'
          }"
          class="comment-profile"
        >

        <div class="comment-content">

          <div class="comment-user">
            ${comment.username}
          </div>

          <div class="comment-text">
            ${comment.text}
          </div>

        </div>

      </div>

      `;
    }
  });

  document.getElementById(
    "commentsList-" + postId
  ).innerHTML = html;
}

// =====================
// 🗳️ VOTE
// =====================

window.voteOption = async function(postId, index){

  const user = auth.currentUser;

  if(!user){

    alert("Connecte-toi");

    return;
  }

  const voteRef = doc(
    db,
    "userVotes",
    user.uid + "_" + postId
  );

  const voteSnap = await getDoc(voteRef);

  if(voteSnap.exists()){

    alert("Tu as déjà voté");

    return;
  }

  const postRef = doc(db, "posts", postId);

  const postSnap = await getDoc(postRef);

  const postData = postSnap.data();

  let options = postData.options;

  options[index].votes =
    (options[index].votes || 0) + 1;

  await updateDoc(postRef,{
    options
  });

  await setDoc(voteRef,{
    userId:user.uid,
    postId,
    option:index,
    createdAt:serverTimestamp()
  });

  await addNotification(
    postData.userId,
    user.uid,
    "vote"
  );

  loadPosts();
};

// =====================
// ❤️ LIKE
// =====================

window.likePost = async function(postId){

  const user = auth.currentUser;

  if(!user){
    alert("Connecte-toi");
    return;
  }

  const likeRef = doc(
    db,
    "postLikes",
    user.uid + "_" + postId
  );

  const likeSnap = await getDoc(likeRef);

  if(likeSnap.exists()){
    alert("Déjà liké");
    return;
  }

  const postRef = doc(db, "posts", postId);

  const postSnap = await getDoc(postRef);

  const postData = postSnap.data();

  await updateDoc(postRef, {
    likes: (postData.likes || 0) + 1
  });

  await setDoc(likeRef, {
    userId: user.uid,
    postId
  });

  await addNotification(
    postData.userId,
    user.uid,
    "like"
  );

  loadPosts();
};

// =====================
// 📤 SHARE
// =====================

window.sharePost = async function(postId){

  const url =
    window.location.origin +
    "/index.html?post=" +
    postId;

  if(navigator.share){

    try{

      await navigator.share({
        title: "Vote App 🔥",
        text: "Viens voter 🔥",
        url
      });

    } catch(e){}

  } else {

    await navigator.clipboard.writeText(url);

    alert("Lien copié !");
  }
};

// =====================
// 👤 OPEN PROFILE
// =====================

window.openUserProfile = function(userId){

  window.location.href =
    "profile.html?user=" + userId;
};

window.openMyProfile = function(){

  window.location.href =
    "profile.html";
};
