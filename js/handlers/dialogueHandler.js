/**
 * Dialogue Handler
 * Handles interactive dialogue system for story scenes
 */

import { DIALOGUE_RESPONSES } from '../constants/index.js';

/**
 * Sets up dialogue interaction system for story scenes
 * @param {number} sceneNum - Scene number (1, 2, or 3)
 */
export function setupDialogueSystem(sceneNum) {
  const dialogueOptionsContainer = document.getElementById(`scene${sceneNum}-dialogue-options`);
  const npcResponse = document.getElementById(`scene${sceneNum}-npc-response`);
  const mainQuestion = document.getElementById(`scene${sceneNum}-main-question`);
  const inputContainer = document.getElementById(`scene${sceneNum}-input-container`);
  const continueBtn = document.getElementById(`story-scene-${sceneNum}-btn`);
  
  if (!dialogueOptionsContainer || !npcResponse || !mainQuestion || !inputContainer || !continueBtn) {
    console.warn(`Dialogue elements not found for scene ${sceneNum}`);
    return;
  }
  
  dialogueOptionsContainer.style.display = 'flex';
  npcResponse.style.display = 'none';
  mainQuestion.style.display = 'none';
  inputContainer.style.display = 'none';
  continueBtn.style.display = 'none';
  
  const existingSkipBtn = dialogueOptionsContainer.querySelector('.skip-dialogue-btn');
  if (existingSkipBtn) {
    existingSkipBtn.remove();
  }
  
  const dialogueOptions = dialogueOptionsContainer.querySelectorAll('.dialogue-btn:not(.skip-dialogue-btn)');
  dialogueOptions.forEach(btn => {
    btn.classList.remove('clicked');
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
  });
  
  const sceneResponses = DIALOGUE_RESPONSES[`scene${sceneNum}`];
  if (!sceneResponses) {
    console.warn(`No dialogue responses found for scene ${sceneNum}`);
    return;
  }
  
  let clickedCount = 0;
  const totalOptions = dialogueOptions.length;
  let skipBtnAdded = false;
  
  dialogueOptions.forEach(btn => {
    btn.addEventListener('click', function handleClick() {
      const responseType = this.getAttribute('data-response');
      const response = sceneResponses[responseType];
      
      if (response && !this.classList.contains('clicked')) {
        this.classList.add('clicked');
        clickedCount++;
        
        npcResponse.innerHTML = `<em>"${response}"</em>`;
        npcResponse.style.display = 'block';
        
        if (!skipBtnAdded && clickedCount > 0) {
          skipBtnAdded = true;
          const skipBtn = document.createElement('button');
          skipBtn.className = 'dialogue-btn skip-dialogue-btn';
          skipBtn.textContent = '"I\'m ready to answer your question"';
          skipBtn.style.marginTop = '0.5rem';
          skipBtn.addEventListener('click', () => {
            mainQuestion.style.display = 'block';
            inputContainer.style.display = 'block';
            continueBtn.style.display = 'block';
            dialogueOptionsContainer.style.display = 'none';
            npcResponse.style.display = 'none';
            const input = inputContainer.querySelector('input, select');
            if (input) {
              setTimeout(() => input.focus(), 100);
            }
          });
          dialogueOptionsContainer.appendChild(skipBtn);
        }
        
        if (clickedCount >= totalOptions) {
          setTimeout(() => {
            mainQuestion.style.display = 'block';
            inputContainer.style.display = 'block';
            continueBtn.style.display = 'block';
            dialogueOptionsContainer.style.display = 'none';
            const input = inputContainer.querySelector('input, select');
            if (input) {
              setTimeout(() => input.focus(), 100);
            }
          }, 1000);
        }
      }
    });
  });
}

