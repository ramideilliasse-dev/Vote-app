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

    // 👤 image profil par défaut
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

  document.getElementById("profile").style.display = "none";

  document.getElementById("createPost").style.display = "none";

  document.getElementById("feedHeader").style.display = "none";

  document.getElementById("notifications").style.display = "none";

  document.getElementById("adminPanel").style.display = "none";

  document.getElementById("authCard").style.display = "block";

  document.getElementById("feed").innerHTML = "";

  document.getElementById("notifList").innerHTML = "";

  alert("Déconnecté !");
};


// =====================
// 🔄 SESSION
// =====================

onAuthStateChanged(auth, async (user) => {

  if(user){

    document.getElementById("authCard").style.display =
      "none";

    document.getElementById("profile").style.display =
      "block";

    document.getElementById("createPost").style.display =
      "block";

    document.getElementById("feedHeader").style.display =
      "block";

    document.getElementById("notifications").style.display =
      "block";

    await loadProfile(user);

    loadPosts();

    loadNotifications();

  } else {

    document.getElementById("authCard").style.display =
      "block";

    document.getElementById("profile").style.display =
      "none";

    document.getElementById("createPost").style.display =
      "none";

    document.getElementById("feedHeader").style.display =
      "none";

    document.getElementById("notifications").style.display =
      "none";

    document.getElementById("feed").innerHTML = "";
  }

});


// =====================
// 👤 PROFIL + PHOTO
// =====================

async function loadProfile(user){

  const ref = doc(db, "users", user.uid);

  const snap = await getDoc(ref);

  if(snap.exists()){

    const data = snap.data();

    document.getElementById("userEmail").innerText =
      "Email : " + data.email;

    document.getElementById("username").innerText =
  "Nom : " + data.username;

// 🖼️ PHOTO PROFIL
if(data.profileImage){

  document.getElementById("myProfileImage").src =
    data.profileImage;
}

    // 👤 PHOTO PROFIL
    if(document.getElementById("myProfileImage")){

      document.getElementById("myProfileImage").src =
        data.profileImage ||
        "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    }

    // 👑 ADMIN
    if(data.role === "admin"){

      isAdmin = true;

      document.getElementById("adminPanel").style.display =
        "block";

      loadUsers();
    }
  }
}


// =====================
// 👑 ADMIN PANEL
// =====================

// 🗑️ supprimer post
window.deletePost = async function(postId){

  if(!isAdmin){
    alert("Accès refusé");
    return;
  }

  await deleteDoc(doc(db, "posts", postId));

  alert("Post supprimé");

  loadPosts();
};


// 🗑️ supprimer tous les posts
window.deleteAllPosts = async function(){

  if(!isAdmin){
    alert("Accès refusé");
    return;
  }

  const snapshot =
    await getDocs(collection(db, "posts"));

  for(const docSnap of snapshot.docs){

    await deleteDoc(
      doc(db, "posts", docSnap.id)
    );
  }

  alert("Tous les posts supprimés");

  loadPosts();
};


// 👤 utilisateurs
async function loadUsers(){

  if(!isAdmin) return;

  const snapshot =
    await getDocs(collection(db, "users"));

  let html = "";

  snapshot.forEach((docSnap) => {

    const user = docSnap.data();

    html += `

      <div style="
        margin-bottom:15px;
        background:#1b2d4d;
        padding:15px;
        border-radius:15px;
      ">

        <div style="
          display:flex;
          align-items:center;
          gap:10px;
        ">

          <img
            src="${
              user.profileImage ||
              'https://cdn-icons-png.flaticon.com/512/149/149071.png'
            }"

            style="
              width:50px;
              height:50px;
              border-radius:50%;
              object-fit:cover;
            "
          >

          <div>
            <div>${user.username}</div>
            <small>${user.email}</small>
          </div>

        </div>

        <button onclick="banUser('${user.uid}')">
          🚫 Bannir
        </button>

        <button onclick="makeAdmin('${user.uid}')">
          👑 Admin
        </button>

        <button onclick="deleteUser('${user.uid}')">
          🗑️ Supprimer
        </button>

      </div>
    `;
  });

  document.getElementById("userList").innerHTML =
    html;
}


// 🚫 bannir
window.banUser = async function(uid){

  if(!isAdmin) return;

  await updateDoc(doc(db, "users", uid), {
    banned: true
  });

  alert("Utilisateur banni");

  loadUsers();
};


// 👑 admin
window.makeAdmin = async function(uid){

  if(!isAdmin) return;

  await updateDoc(doc(db, "users", uid), {
    role: "admin"
  });

  alert("Utilisateur devenu admin");

  loadUsers();
};


// 🗑️ supprimer user
window.deleteUser = async function(uid){

  if(!isAdmin) return;

  await deleteDoc(doc(db, "users", uid));

  const postsQuery = query(
    collection(db, "posts"),
    where("userId", "==", uid)
  );

  const postsSnap = await getDocs(postsQuery);

  for(const postDoc of postsSnap.docs){

    await deleteDoc(
      doc(db, "posts", postDoc.id)
    );
  }

  alert("Utilisateur supprimé");

  loadUsers();

  loadPosts();
};


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

      if(notif.type === "follow"){
        html += `<p>👥 Nouveau follower</p>`;
      }
    }
  });

  document.getElementById("notifList").innerHTML =
    html || "<p>Aucune notification</p>";
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
// 📝 CREATE POST
// =====================

window.createPost = async function(){

  try{

    const user = auth.currentUser;

    if(!user){
      alert("Connecte-toi");
      return;
    }

    const question =
      document.getElementById("question").value.trim();

    const total =
      parseInt(
        document.getElementById("totalOptions").value
      );

    if(!question){
      alert("Question obligatoire");
      return;
    }

    let options = [];

    // 🅰️
    const optionA =
      document.getElementById("optionA").value.trim();

    const imageA =
      document.getElementById("imageA").files[0];

    if(optionA){

      options.push({
        text: optionA,
        image: await uploadImage(imageA),
        votes: 0
      });
    }

    // 🅱️
    const optionB =
      document.getElementById("optionB").value.trim();

    const imageB =
      document.getElementById("imageB").files[0];

    if(optionB){

      options.push({
        text: optionB,
        image: await uploadImage(imageB),
        votes: 0
      });
    }

    // 🅲
    if(total >= 3){

      const optionC =
        document.getElementById("optionC").value.trim();

      const imageC =
        document.getElementById("imageC").files[0];

      if(optionC){

        options.push({
          text: optionC,
          image: await uploadImage(imageC),
          votes: 0
        });
      }
    }

    // 🅳
    if(total >= 4){

      const optionD =
        document.getElementById("optionD").value.trim();

      const imageD =
        document.getElementById("imageD").files[0];

      if(optionD){

        options.push({
          text: optionD,
          image: await uploadImage(imageD),
          votes: 0
        });
      }
    }

    // 🅴
    if(total >= 5){

      const optionE =
        document.getElementById("optionE").value.trim();

      const imageE =
        document.getElementById("imageE").files[0];

      if(optionE){

        options.push({
          text: optionE,
          image: await uploadImage(imageE),
          votes: 0
        });
      }
    }

    // 🅵
    if(total >= 6){

      const optionF =
        document.getElementById("optionF").value.trim();

      const imageF =
        document.getElementById("imageF").files[0];

      if(optionF){

        options.push({
          text: optionF,
          image: await uploadImage(imageF),
          votes: 0
        });
      }
    }

    if(options.length < 2){
      alert("Minimum 2 choix");
      return;
    }

    const userSnap =
      await getDoc(doc(db, "users", user.uid));

    const userData = userSnap.data();

    await addDoc(collection(db, "posts"), {

      userId: user.uid,

      username: userData.username,

      userProfileImage:
        userData.profileImage || "",

      question,

      options,

      likes: 0,

      comments: 0,

      createdAt: serverTimestamp()
    });

    alert("Post publié 🚀");

    loadPosts();

  } catch(error){
    alert(error.message);
  }
};


// =====================
// 📱 FEED MODERNE
// =====================

async function loadPosts(){

  const snapshot = await getDocs(collection(db, "posts"));

  let posts = [];

  for(const docSnap of snapshot.docs){

    const post = docSnap.data();

    posts.push({
      id: docSnap.id,
      ...post
    });
  }

  // récent en premier
  posts.sort((a,b) => {
    return (b.createdAt?.seconds || 0)
    - (a.createdAt?.seconds || 0);
  });

  let html = "";

  posts.forEach((post) => {

    html += `

    <div class="post-card">

      <!-- HEADER -->
      <div class="post-header">

        ${
          post.profileImage
          ?
          `
          <img
            src="${post.profileImage}"
            class="profile-photo"
            onclick="openUserProfile('${post.userId}')"
          >
          `
          :
          `
          <div
          class="avatar"
          onclick="openUserProfile('${post.userId}')">

            ${post.username.charAt(0).toUpperCase()}

          </div>
          `
        }

        <div
        class="username"
        onclick="openUserProfile('${post.userId}')">

          ${post.username}

        </div>

      </div>

      <!-- QUESTION -->
      <div class="post-question">

        ${post.question}

      </div>

      <!-- OPTIONS -->
      <div class="options-grid">
    `;

    // =====================
    // MULTI OPTIONS
    // =====================

    if(post.options){

      post.options.forEach((option, index) => {

        html += `

        <div class="option-card">

          <img src="${option.image}">

          <div class="option-name">

            ${option.name}

          </div>

          <button
          onclick="voteOption('${post.id}', ${index})">

            🗳️ VOTER

          </button>

          <div style="
          padding:10px;
          text-align:center;
          font-weight:bold;">

            ${option.votes || 0} votes

          </div>

        </div>

        `;
      });

    }

    html += `

      </div>

      <!-- ACTIONS -->
      <div class="post-actions">

        <button onclick="likePost('${post.id}')">
          ❤️ ${post.likes || 0}
        </button>

        <button onclick="sharePost('${post.id}')">
          📤 Partager
        </button>

        ${
          isAdmin
          ?
          `
          <button
          onclick="deletePost('${post.id}')"
          class="admin-btn">

            🗑️

          </button>
          `
          :
          ""
        }

      </div>

    </div>

    `;
  });

  document.getElementById("feed").innerHTML = html;
}

// =====================
// 🗳️ VOTE OPTIONS
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
    alert("Déjà voté");
    return;
  }

  const postRef = doc(db, "posts", postId);

  const postSnap = await getDoc(postRef);

  const postData = postSnap.data();

  let options = postData.options;

  options[index].votes++;

  await updateDoc(postRef, {
    options
  });

  await setDoc(voteRef, {
    userId: user.uid,
    postId,
    optionIndex: index,
    createdAt: serverTimestamp()
  });

  await addNotification(
    postData.userId,
    user.uid,
    "vote"
  );

  alert("Vote enregistré");

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
// 🔄 REFRESH
// =====================

window.refreshFeed = function(){
  loadPosts();
};
// =====================
// 🗳️ VOTE MULTI OPTIONS
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

  // anti double vote
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

  alert("Vote enregistré 🔥");

  loadPosts();
}
