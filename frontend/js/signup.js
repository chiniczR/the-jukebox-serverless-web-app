// Setting the user pool data - requires Cognito configuration to be set up
// on the config.js file (and for this file to be included)
var poolData = {
    UserPoolId: _config.cognito.userPoolId,
    ClientId: _config.cognito.userPoolClientId
};

var userPool;

// We can only work here if Cognito is set up
if (!(_config.cognito.userPoolId &&
    _config.cognito.userPoolClientId &&
    _config.cognito.region)) {
    alert("Amazon Cognito is not configured!")
}
else {
    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    // Go check with Cognito if there is a user currently logged in here
    var authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } 
                else if (!session.isValid()) {
                    resolve(null);
                } 
                else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } 
        else {  // If there is no user logged in here
            resolve(null);
        }
    });
    // Run the above check and then:
    authToken.then(function setAuthToken(token) {
        if (token) {    // If we got a token => there is a user logged in
            alert('You are already logged in! You must logout before accessing this page.')
            window.location.assign('./index.html')
        }
    }).catch(function handleTokenError(error) {
        alert(error);
        window.location.assign('./index.html');
    });

    // User pool functions

    function register(email, password, onSuccess, onFailure) {
        var dataEmail = {
            Name: 'email',
            Value: email
        };
        var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);

        userPool.signUp(email, password, [attributeEmail], null,
            function signUpCallback(err, result) {
                if (!err) {
                    onSuccess(result);
                } 
                else {
                    onFailure(err);
                }
            }
        );
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: email,
            Pool: userPool
        });
    }
}

// Event handlers

function handleRegister(event) {
    event.preventDefault();

    var email = document.getElementById('exampleInputEmail1').value;
    var password = document.getElementById('exampleInputPassword1').value;
    var password2 = document.getElementById('exampleConfirmPassword1').value;

    var onSuccess = function registerSuccess(result) {
        var cognitoUser = result.user;
        var confirmation = ('Registration successful. Please check your email inbox or spam folder for your verification code.');
        if (confirmation) {
            window.location.href = 'verify.html';
        }
    };
    var onFailure = function registerFailure(err) {
        alert(err);
    };
    
    if (password === password2) {
        register(email, password, onSuccess, onFailure);
    } 
    else {
        alert('Passwords do not match');
    }
}
