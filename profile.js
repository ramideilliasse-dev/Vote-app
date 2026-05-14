 import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  query,
  where,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// =====================
// 🌍 USER PROFILE ID
// =====================

const params =
  new URLSearchParams(window.location.search);

const profileUserId =
  params.get("user");

// =====================
// 👤 CURRENT PROFILE
// =====================

let currentProfileId = "";

// =====================
// ✅ VERIFIED BADGE
// =====================

function showVerifiedBadge(userData){

  const badge =
    document.getElementById("verifiedBadge");

  if(!badge) return;

  if(
    userData.role === "verified" ||
    userData.role === "admin" ||
    userData.role === "superadmin"
  ){

    badge.style.display = "inline";

  }else{

    badge.style.display = "none";
  }
}
// =====================
// 👤 CURRENT USER
// =====================

let currentUserData = null;

// =====================
// 👤 CHARGER PROFIL
// =====================

onAuthStateChanged(auth, async(user) => {

  if(!user){
    window.location.href = "index.html";
    return;
  }

  const userSnap =
    await getDoc(doc(db,"users",user.uid));

  currentUserData = userSnap.data();

 const targetUid =
  profileUserId || user.uid;

currentProfileId = targetUid;

await loadProfile(targetUid);

await loadUserPosts(targetUid);

// FOLLOW BUTTON
const followBtn =
  document.getElementById("followBtn");

if(followBtn){

  if(targetUid === user.uid){

    followBtn.style.display = "none";

  }else{

    followBtn.style.display = "inline-block";
  }
}
});

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

  const response = await fetch(
    "https://api.imgbb.com/1/upload?key=ba51854ee84cfa7eb88af864a04ac02f",
    {
      method:"POST",
      body:formData
    }
  );

  const data = await response.json();

  return data.data.url;
}

// =====================
// 👤 LOAD PROFILE
// =====================

async function loadProfile(uid){

  try{

    const userRef = doc(db, "users", uid);

    const userSnap = await getDoc(userRef);

    if(!userSnap.exists()) return;

    const userData = userSnap.data();
showVerifiedBadge(userData);
    // COVER
    document.getElementById("coverImage").src =
      userData.coverImage ||
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600";

    // PROFILE IMAGE
    document.getElementById("profileImage").src =
      userData.profileImage ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    // USERNAME
    let verifiedBadge = "";

    if(userData.verified === true){

      verifiedBadge = `
        <span style="
          color:#1877f2;
          font-size:18px;
          margin-left:5px;
        ">
          ✔️
        </span>
      `;
    }

    document.getElementById("profileUsername").innerHTML =
      (userData.username || "Utilisateur")
      + verifiedBadge;

    // BIO
    document.getElementById("profileBio").innerText =
      userData.bio || "Salut 👋";

    // =====================
    // 📊 POSTS + LIKES
    // =====================

    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", uid)
    );

    const postsSnapshot =
      await getDocs(postsQuery);

    let totalPosts = 0;

    let totalLikes = 0;

    postsSnapshot.forEach((docSnap) => {

      totalPosts++;

      const post = docSnap.data();

      totalLikes += post.likes || 0;

    });

    // POSTS
    if(document.getElementById("postsCount")){
      document.getElementById("postsCount").innerText =
        totalPosts;
    }

    // FOLLOWERS
    document.getElementById("followersCount").innerText =
      userData.followers || 0;

    // LIKES
    document.getElementById("likesCount").innerText =
      totalLikes;

  }catch(error){

    console.log(error);

  }
}

// =====================
// ✏️ MODIFIER PROFIL
// =====================

window.saveProfile = async function(){

  try{

    const user = auth.currentUser;

    if(!user) return;

    const username =
      document.getElementById("editUsername").value.trim();

    const bio =
      document.getElementById("editBio").value.trim();

    const profileFile =
      document.getElementById("profileFile").files[0];

    const coverFile =
      document.getElementById("coverFile").files[0];

    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    const oldData = userSnap.data();

    let profileImage = oldData.profileImage || "";

    let coverImage = oldData.coverImage || "";

    // PHOTO PROFIL
    if(profileFile){
      profileImage = await uploadImage(profileFile);
    }

    // PHOTO COVER
    if(coverFile){
      coverImage = await uploadImage(coverFile);
    }

    await updateDoc(userRef, {

      username:
        username || oldData.username,

      bio:
        bio || oldData.bio,

      profileImage,

      coverImage

    });

    alert("Profil mis à jour 🔥");

    await loadProfile(user.uid);

  }catch(error){

    alert(error.message);

  }
};

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

    const total = parseInt(
      document.getElementById("totalOptions").value
    );

    if(!question){
      alert("Écris une question");
      return;
    }

    const userSnap = await getDoc(
      doc(db, "users", user.uid)
    );

    const userData = userSnap.data();

    let options = [];

    const letters = ["A","B","C","D","E","F"];

    for(let i = 0; i < total; i++){

      const letter = letters[i];

      const text =
        document.getElementById("option" + letter).value.trim();

      const file =
        document.getElementById("image" + letter).files[0];

      if(!text){
        alert("Remplis toutes les options");
        return;
      }

      let imageUrl = "";

      if(file){
        imageUrl = await uploadImage(file);
      }

      options.push({
        text,
        imageUrl,
        votes:0
      });
    }

    await addDoc(collection(db, "posts"), {

      userId:user.uid,

      username:userData.username,

      verified:userData.verified || false,

      profileImage:userData.profileImage || "",

      question,

      options,

      likes:0,

      comments:0,

      createdAt:serverTimestamp()

    });

    // RESET
    document.getElementById("question").value = "";

    letters.forEach((letter) => {

      const optionInput =
        document.getElementById("option" + letter);

      const imageInput =
        document.getElementById("image" + letter);

      if(optionInput) optionInput.value = "";

      if(imageInput) imageInput.value = "";

    });

    alert("Post publié 🔥");

    await loadProfile(user.uid);

    await loadUserPosts(user.uid);

  }catch(error){

    alert(error.message);

  }
};

// =====================
// 🗑️ DELETE POST
// =====================

window.deletePost = async function(postId){

  try{

    const confirmDelete =
      confirm("Supprimer ce post ?");

    if(!confirmDelete) return;

    await deleteDoc(doc(db,"posts",postId));

    alert("Post supprimé");

    const user = auth.currentUser;

    await loadUserPosts(user.uid);

    await loadProfile(user.uid);

  }catch(error){

    console.log(error);

    alert("Erreur suppression");
  }
};

// =====================
// 📱 USER POSTS
// =====================

async function loadUserPosts(uid){

  try{

    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", uid)
    );

    const snapshot = await getDocs(postsQuery);

    let posts = [];

    snapshot.forEach((docSnap) => {

      posts.push({
        id: docSnap.id,
        ...docSnap.data()
      });

    });

    posts.sort((a,b) => {
      return (b.createdAt?.seconds || 0)
      - (a.createdAt?.seconds || 0);
    });

    let html = "";

    if(posts.length === 0){

      html = `
        <div class="empty-posts">
          Aucun post pour le moment
        </div>
      `;

    }

    posts.forEach((post) => {

      let verifiedBadge = "";

      if(post.verified === true){

        verifiedBadge = `
          <span style="
            color:#1877f2;
            font-size:15px;
            margin-left:4px;
          ">
            ✔️
          </span>
        `;
      }

      html += `

      <div class="profile-post-card">

        <div class="profile-post-header">

          <img
            src="${
              post.profileImage ||
              'https://cdn-icons-png.flaticon.com/512/149/149071.png'
            }"
            class="profile-post-avatar"
          >

          <div>
            <div class="profile-post-name">
              ${post.username}
              ${verifiedBadge}
            </div>
          </div>

        </div>

        <div class="profile-post-question">
          ${post.question}
        </div>

        <div class="profile-options-grid">
      `;

      if(post.options){

        post.options.forEach((option) => {

          html += `

          <div class="profile-option-card">

            ${
              option.imageUrl
              ?
              `
              <img
                src="${option.imageUrl}"
                class="profile-option-image"
              >
              `
              :
              `
              <div class="profile-no-image">
                🖼️
              </div>
              `
            }

            <div class="profile-option-name">
              ${option.text}
            </div>

            <div class="profile-votes">
              🗳️ ${option.votes || 0} votes
            </div>

          </div>

          `;

        });

      }

      html += `

        </div>

        <div style="
          display:flex;
          gap:10px;
          padding:15px;
        ">

          <button
            onclick="openPost('${post.id}')"
            style="
              flex:1;
              border:none;
              background:#1877f2;
              color:white;
              padding:12px;
              border-radius:12px;
              font-weight:bold;
            "
          >
            Ouvrir
          </button>

          <button
            onclick="deletePost('${post.id}')"
            style="
              flex:1;
              border:none;
              background:#e53935;
              color:white;
              padding:12px;
              border-radius:12px;
              font-weight:bold;
            "
          >
            Supprimer
          </button>

        </div>

      </div>

      `;

    });

    document.getElementById("userPosts").innerHTML = html;

  }catch(error){

    console.log(error);

  }
}

// =====================
// 🔄 OPTIONS DYNAMIQUES
// =====================

const totalOptions = document.getElementById("totalOptions");

if(totalOptions){

  totalOptions.addEventListener("change", () => {

    const total = parseInt(totalOptions.value);

    document.getElementById("option3Box").style.display =
      total >= 3 ? "block" : "none";

    document.getElementById("option4Box").style.display =
      total >= 4 ? "block" : "none";

    document.getElementById("option5Box").style.display =
      total >= 5 ? "block" : "none";

    document.getElementById("option6Box").style.display =
      total >= 6 ? "block" : "none";

  });

}

// =====================
// 📖 OPEN POST
// =====================

window.openPost = function(postId){

  window.location.href =
    "post.html?post=" + postId;
};
// =====================
// ➕ FOLLOW USER
// =====================

window.followThisUser = async function(){

  try{

    const user = auth.currentUser;

    if(!user){
      return;
    }

    if(currentProfileId === user.uid){
      return;
    }

    const profileRef =
      doc(db,"users",currentProfileId);

    const profileSnap =
      await getDoc(profileRef);

    if(!profileSnap.exists()) return;

    const profileData =
      profileSnap.data();

    const currentFollowers =
      profileData.followers || 0;

    await updateDoc(profileRef,{
      followers: currentFollowers + 1
    });

    const followBtn =
      document.getElementById("followBtn");

    if(followBtn){

      followBtn.innerText =
        "✔️ Suivi";

      followBtn.disabled = true;

      followBtn.style.opacity = "0.8";
    }

    alert("Utilisateur suivi 🔥");

    await loadProfile(currentProfileId);

  }catch(error){

    console.log(error);
  }
};

// =====================
// 🚪 LOGOUT
// =====================

window.logout = function(){

  window.location.href =
    "settings.html";
};
