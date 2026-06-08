import express from 'express';
import morgan from 'morgan';
import authRouter from './routes/auth.route.js';
import postRouter from './routes/post.route.js';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './config/config.js';
import cors from 'cors';
import router from './routes/user.route.js';
import storyRouter from './routes/story.route.js';
import messageRouter from './routes/message.route.js';

const app=express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(passport.initialize());
app.use(cors(
  {
    origin:["http://localhost:5173","http://localhost:5174", "http://localhost:3000"],
    credentials:true,
  }
))
passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: `/api/auth/google/callback`,
      proxy: true
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    },
  ), 
); 

app.use("/api/auth",authRouter)
app.use("/api/posts", postRouter)
app.use("/api/users",router)
app.use("/api/stories", storyRouter)
app.use("/api/messages", messageRouter)

app.use(express.static("public"))

app.get("*lucy",(req,res)=>{
  res.sendFile("index.html",{root:"public"})
})

export default app;
