/*src/components/logIn.tsx*/


import React, { useState, useRef } from "react";
import loadArgon2idWasm from 'argon2id';
import { Filter } from 'bad-words'


const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,20}$/;
const PASSWORD_REGEX = /^.{8,64}$/;

const filter = new Filter();
const newBadWords = ['admin', 'moderator', 'mod', 'owner', 'help', 'support', 'system', 'bot', 
    'ChessBox', 'official', 'staff', 'developer', 'server', 'ChessBoxAdmin', 'OfficialSupport',
    'SystemBot', 'magnus', 'carlsen', 'hikaru', 'nakamura', 'firouzja', 'nepo', 'fischer', 
    'kasparov', 'tal', 'anand']

filter.addWords(...newBadWords)
var list = require('badwords-list'),
	array = list.array,
	object = list.object,
	regex = list.regex;


const argon2id = await loadArgon2idWasm();

const hash = argon2id({
  password: new Uint8Array(...),
  salt: crypto.getRandomValues(new Uint8Array(32)),
  parallelism: 4,
  passes: 3,
  memorySize: 2**16
});


export function LogIn() {
  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        <h2>Sign into ChessBox</h2>

       <input
        type="text"
        name="username"
        minLength={3}
        maxLength={20}
        pattern="^[A-Za-z0-9_-]+$"
        required
        />

       <input
        type="text"
        name="password"
        minLength={8}
        maxLength={64}
        pattern="^[A-Za-z0-9_-]+$"
        required
        />

      </div>
    </div>
  );
}
