 import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// =====================
// 🔥 UID URL
// =====================

const params = new URLSearchParams(window.location.search);
const profileUid = params.get("uid");

let currentUser = null;


// =====================
// 🔄 SESSION
// =====================

onAuthStateChanged(auth, async(user)=>{

  currentUser = user;

  if(profileUid){
    loadProfile(profileUid);
    loadUserPosts(profileUid);
    loadStats(profileUid);
    checkFollow(profileUid);
  }

});


// =====================
// 👤 LOAD PROFILE
// =====================

async function loadProfile(uid){

  const ref = doc(db,"users",uid);
  const snap = await getDoc(ref);

  if(snap.exists()){

    const data = snap.data();

    document.getElementById("profileUsername").innerText =
      "@" + (data.username || "user");

    document.getElementById("profileBio").innerText =
      data.bio || "Aucune bio";

    if(data.photoURL){
      document.getElementById("profileImage").src =
        data.photoURL;
    }

    if(data.coverURL){
      document.getElementById("cover").style.backgroundImage =
        `url('${data.coverURL}')`;
    }

  }

}


// =====================
// 🔥 USER POSTS
// =====================

async function loadUserPosts(uid){

  const postsRef = collection(db,"posts");

  const q = query(
    postsRef,
    where("userId","==",uid)
  );

  const snapshot = await getDocs(q);

  let html = "";
  let count = 0;

  snapshot.forEach((docSnap)=>{

    const post = docSnap.data();

    const score =
      (post.votesA || 0) +
      (post.votesB || 0);

    count++;

    html += `
    <div class="post-card">

      ${
        post.imageUrl
        ?
        `<img src="${post.imageUrl}">`
        :
        ""
      }

      <div class="post-content">

        <div class="post-question">
          ${post.question}
        </div>

        <div class="score">
          🔥 ${score} votes
        </div>

      </div>

    </div>
    `;

  });

  document.getElementById("userPosts").innerHTML = html;

  document.getElementById("postsCount").innerText =
    count;

}


// =====================
// 📊 STATS
// =====================

async function loadStats(uid){

  const postsRef = collection(db,"posts");

  const q = query(
    postsRef,
    where("userId","==",uid)
  );

  const snapshot = await getDocs(q);

  let totalVotes = 0;
  let totalLikes = 0;

  snapshot.forEach((docSnap)=>{

    const post = docSnap.data();

    totalVotes +=
      (post.votesA || 0) +
      (post.votesB || 0);

    totalLikes +=
      post.likes || 0;

  });

  document.getElementById("votesCount").innerText =
    totalVotes;

  document.getElementById("likesCount").innerText =
    totalLikes;

}


// =====================
// 👥 FOLLOW
// =====================

async function checkFollow(targetUid){

  if(!currentUser) return;

  const followId =
    currentUser.uid + "_" + targetUid;

  const ref = doc(db,"follows",followId);

  const snap = await getDoc(ref);

  if(snap.exists()){

    document.getElementById("followBtn").innerText =
      "✅ Abonné";

  }else{

    document.getElementById("followBtn").innerText =
      "👥 Suivre";

  }

}


// =====================
// 🔥 FOLLOW / UNFOLLOW
// =====================

window.followUser = async function(){

  if(!currentUser){
    alert("Connecte-toi");
    return;
  }

  if(currentUser.uid === profileUid){
    alert("C'est ton profil");
    return;
  }

  const followId =
    currentUser.uid + "_" + profileUid;

  const ref = doc(db,"follows",followId);

  const snap = await getDoc(ref);

  if(snap.exists()){

    await updateDoc(ref,{
      active:false
    });

    await setDoc(ref,{
      active:false
    });

    document.getElementById("followBtn").innerText =
      "👥 Suivre";

  }else{

    await setDoc(ref,{
      followerId:currentUser.uid,
      followingId:profileUid,
      active:true
    });

    document.getElementById("followBtn").innerText =
      "✅ Abonné";

  }

};

// =========================
// 📸 UPLOAD IMAGE
// =========================

async function uploadImage(file){

  if(!file) return "";

  const formData = new FormData();

  formData.append("image", file);

  const res = await fetch(
    "https://api.imgbb.com/1/upload?key=ba51854ee84cfa7eb88af864a04ac02f",
    {
      method:"POST",
      body:formData
    }
  );

  const data = await res.json();

  return data.data.url;
}


// =========================
// 💾 SAVE PROFILE
// =========================

window.saveProfile = async function(){

  try{

    const user = auth.currentUser;

    if(!user){
      alert("Connecte-toi");
      return;
    }

    const bio =
      document.getElementById("newBio").value;

    const profileFile =
      document.getElementById("profileImageFile").files[0];

    const coverFile =
      document.getElementById("coverImageFile").files[0];

    let profileImage = "";
    let coverImage = "";

    // 📷 upload profil
    if(profileFile){
      profileImage = await uploadImage(profileFile);
    }

    // 🖼️ upload couverture
    if(coverFile){
      coverImage = await uploadImage(coverFile);
    }

    let updateData = {
      bio
    };

    if(profileImage){
      updateData.profileImage = profileImage;
    }

    if(coverImage){
      updateData.coverImage = coverImage;
    }

    await updateDoc(
      doc(db, "users", user.uid),
      updateData
    );

    // refresh UI
    if(profileImage){
      document.getElementById("profileImage").src =
        profileImage;
    }

    if(coverImage){
      document.getElementById("cover").style.backgroundImage =
        `url(${coverImage})`;
    }

    document.getElementById("profileBio").innerText =
      bio;

    alert("Profil mis à jour ✅");

  } catch(error){
    alert(error.message);
  }
}


// =====================
// 👆 BUTTON FOLLOW
// =====================

document
.getElementById("followBtn")
.addEventListener("click",followUser);
