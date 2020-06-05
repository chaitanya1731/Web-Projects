document.getElementById('id').addEventListener('focusout', fetchUserData);

async function fetchUserData(){
    try{
        const userID = document.getElementById("id").value;
        const errorTag = document.getElementsByClassName("error").id;
        errorTag.innerHTML = "";
        if(String(userID).length > 0) {
            const users = await fetch(`/users?id=${userID}&isUserCheck=true`)
            const isUser = await users.json();
            if (isUser.length === 0) {
                errorTag.innerHTML = `There is no user with id ${userID}`;
            }
            console.log(isUser);
        }
    }
    catch (err) {
        console.log(err);
    }

}
