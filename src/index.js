import './css/style.sass';
import circleLogoImage from './images/Circle_Logo.png';
import circleRectLogoImage from './images/Circle_Logo_Rectangle.png';
import haienaImage from './images/haiena_top.png';
import gemumaLogoImage from './images/Gemuma_Logo.png';
import twitterLogoImage from './images/Twitter_Logo.png';
import noteLogoImage from './images/Note_Logo.png';
import boothLogoImage from './images/Booth_Logo.png';
import surveyLogoImage from './images/Survey_Logo.png';
import questionLogoImage from './images/Question_Logo.png';



let circleLogo = document.createElement('img');
circleLogo.src = circleLogoImage;
document.getElementById('circle-logo').appendChild(circleLogo);


let circleRectLogo = document.createElement('img');
circleRectLogo.src = circleRectLogoImage;
document.getElementById('circle-rect-logo').appendChild(circleRectLogo);


let haienaLogo = document.createElement('img');
haienaLogo.src = haienaImage;
document.getElementById('haiena-logo').appendChild(haienaLogo);


let gemumaLogo = document.createElement('img');
gemumaLogo.src = gemumaLogoImage;
document.getElementById('gemuma-logo').appendChild(gemumaLogo);


let twitterLogo = document.createElement('img');
twitterLogo.src = twitterLogoImage;
document.getElementById('twitter-logo').appendChild(twitterLogo);


let noteLogo = document.createElement('img');
noteLogo.src = noteLogoImage;
document.getElementById('note-logo').appendChild(noteLogo);


let boothLogo = document.createElement('img');
boothLogo.src = boothLogoImage;
document.getElementById('booth-logo').appendChild(boothLogo);


let surveyLogo = document.createElement('img');
surveyLogo.src = surveyLogoImage;
document.getElementById('survey-logo').appendChild(surveyLogo);


let questionLogo = document.createElement('img');
questionLogo.src = questionLogoImage;
document.getElementById('question-logo').appendChild(questionLogo)