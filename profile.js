 import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// =========================
// USER ID
// =========================

const params = new URLSearchParams(window.location.search);

let profileUserId = params.get("user");


// =========================
// LOAD PROFILE
// =========================

onAuthStateChanged(auth, async(user)=>{

  if(!user){
    window.location.href = "index.html";
    return;
  }

  // mon profil
  if(!profileUserId){
    profileUserId = user.uid;
  }

  loadProfile(profileUserId);

});


// =========================
// LOAD PROFILE DATA
// =========================

async function loadProfile(uid){

  try{

    const userRef = doc(db, "users", uid);

    const userSnap = await getDoc(userRef);

    if(!userSnap.exists()){
      alert("Profil introuvable");
      return;
    }

    const data = userSnap.data();

    // username
    document.getElementById("profileUsername").innerText =
      "@" + (data.username || "utilisateur");

    // bio
    document.getElementById("profileBio").innerText =
      data.bio || "Aucune bio";

    // image profil
    if(data.profileImage){

      document.getElementById("profileImage").src =
        data.profileImage;
    }

    // image couverture
    if(data.coverImage){

      document.getElementById("cover").style.backgroundImage =
        `url('${data.coverImage}')`;
    }

  } catch(error){

    alert(error.message);

  }

}


// =========================
// PREVIEW IMAGE PROFIL
// =========================

document
.getElementById("profileImageFile")
.addEventListener("change", function(e){

  const file = e.target.files[0];

  if(!file) return;

  const reader = new FileReader();

  reader.onload = function(event){

    document.getElementById("profileImage").src =
      event.target.result;

  };

  reader.readAsDataURL(file);

});


// =========================
// PREVIEW COVER
// =========================

document
.getElementById("coverImageFile")
.addEventListener("change", function(e){

  const file = e.target.files[0];

  if(!file) return;

  const reader = new FileReader();

  reader.onload = function(event){

    document.getElementById("cover").style.backgroundImage =
      `url('${event.target.result}')`;

  };

  reader.readAsDataURL(file);

});


// =========================
// UPLOAD IMAGE
// =========================

async function uploadImage(file){

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


// =========================
// SAVE PROFILE
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

    let profileImage = null;
    let coverImage = null;

    // upload profil
    if(profileFile){

      profileImage = await uploadImage(profileFile);

    }

    // upload couverture
    if(coverFile){

      coverImage = await uploadImage(coverFile);

    }

    const updateData = {
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

    alert("Profil enregistré ✅");

  } catch(error){

    alert(error.message);

  }

};
