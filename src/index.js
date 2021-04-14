import './css/style.sass';
import circleLogoImage from './images/Circle_Logo.png';
import circleRectLogoImage from './images/Circle_Logo_Rectangle.png';
import haienaImage from './images/haiena_top.png';
import haiena2Image from './images/haiena2_top.jpg';
import gemumaLogoImage from './images/Gemuma_Logo.png';
import twitterLogoImage from './images/Twitter_Logo.png';
import noteLogoImage from './images/Note_Logo.png';
import boothLogoImage from './images/Booth_Logo.png';
import bodogemaLogoImage from './images/Bodogema_Logo.png';
import youtubeLogoImage from './images/Youtube_Logo.png';
import surveyLogoImage from './images/Survey_Logo.png';
import questionLogoImage from './images/Question_Logo.png';



let circleLogo = document.createElement('img');
circleLogo.src = circleLogoImage;
document.getElementById('circle-logo').appendChild(circleLogo);
circleLogo.setAttribute("alt", "RockAndGames");


let circleRectLogo = document.createElement('img');
circleRectLogo.src = circleRectLogoImage;
document.getElementById('circle-rect-logo').appendChild(circleRectLogo);
circleRectLogo.setAttribute("alt", "RockAndGames");


let haienaLogo = document.createElement('img');
haienaLogo.src = haienaImage;
document.getElementById('haiena-logo').appendChild(haienaLogo);
haienaLogo.setAttribute("alt", "ハイエナ勇者はサボリたい");

let haiena2Logo = document.createElement('img');
haiena2Logo.src = haiena2Image;
document.getElementById('haiena2-logo').appendChild(haiena2Logo);
haiena2Logo.setAttribute("alt", "ハイエナ勇者はサボリたい(拡張版)");

let gemumaLogo = document.createElement('img');
gemumaLogo.src = gemumaLogoImage;
document.getElementById('gemuma-logo').appendChild(gemumaLogo);
gemumaLogo.setAttribute("alt", "ゲームマーケットロゴ");


let twitterLogo = document.createElement('img');
twitterLogo.src = twitterLogoImage;
document.getElementById('twitter-logo').appendChild(twitterLogo);
twitterLogo.setAttribute("alt", "Twitterロゴ");


let noteLogo = document.createElement('img');
noteLogo.src = noteLogoImage;
document.getElementById('note-logo').appendChild(noteLogo);
noteLogo.setAttribute("alt", "noteロゴ");


let boothLogo = document.createElement('img');
boothLogo.src = boothLogoImage;
document.getElementById('booth-logo').appendChild(boothLogo);
boothLogo.setAttribute("alt", "BOOTHロゴ");


let bodogemaLogo = document.createElement('img');
bodogemaLogo.src = bodogemaLogoImage;
document.getElementById('bodogema-logo').appendChild(bodogemaLogo);
bodogemaLogo.setAttribute("alt", "ボドゲーマロゴ");


let youtubeLogo = document.createElement('img');
youtubeLogo.src = youtubeLogoImage;
document.getElementById('youtube-logo').appendChild(youtubeLogo);
youtubeLogo.setAttribute("alt", "Youtubeロゴ");


let surveyLogo = document.createElement('img');
surveyLogo.src = surveyLogoImage;
document.getElementById('survey-logo').appendChild(surveyLogo);
surveyLogo.setAttribute("alt", "クエスチョンロゴ");


let questionLogo = document.createElement('img');
questionLogo.src = questionLogoImage;
document.getElementById('question-logo').appendChild(questionLogo);
questionLogo.setAttribute("alt", "アンケートロゴ");