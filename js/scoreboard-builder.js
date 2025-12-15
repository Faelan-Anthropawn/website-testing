let rowCounter = 0;

const rowsContainer = document.getElementById('scoreboard-rows');
const addRowButton = document.getElementById('scoreboard-add-row');
const outputTextarea = document.getElementById('scoreboard-output');
const copyButton = document.getElementById('scoreboard-copy');
const targetInput = document.getElementById('scoreboard-target');
const displayTypeSelect = document.getElementById('scoreboard-display-type');
const helpButton = document.getElementById('scoreboard-help-button');

function createRowElement(id) {
  const row = document.createElement('div');
  row.className = 'scoreboard-row flex flex-col sm:flex-row gap-3 p-4 rounded-lg card';
  row.dataset.rowId = id;

  row.innerHTML = `
    <div class="flex-shrink-0 w-full sm:w-32">
      <select class="row-type input-field w-full h-10 rounded-lg text-white text-sm px-3 appearance-none bg-[right_0.5rem_center] bg-no-repeat bg-[length:1.25em_1.25em]" style="background-image: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 20 20\"><path stroke=\"%2394a3b8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"m6 8 4 4 4-4\"/></svg>')">
        <option value="text">Text</option>
        <option value="score">Score</option>
        <option value="selector">Selector</option>
      </select>
    </div>
    <div class="row-fields flex-1 flex flex-col sm:flex-row gap-3">
      <input type="text" class="row-text-input input-field flex-1 h-10 rounded-lg text-white text-sm px-3" placeholder="Enter text"/>
    </div>
    <button type="button" class="row-delete flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
      <span class="material-symbols-outlined text-xl">delete</span>
    </button>
  `;

  const typeSelect = row.querySelector('.row-type');
  const fieldsContainer = row.querySelector('.row-fields');
  const deleteButton = row.querySelector('.row-delete');

  typeSelect.addEventListener('change', () => {
    updateRowFields(fieldsContainer, typeSelect.value);
    generateCommand();
  });

  fieldsContainer.addEventListener('input', generateCommand);

  deleteButton.addEventListener('click', () => {
    row.remove();
    generateCommand();
  });

  return row;
}

function updateRowFields(container, type) {
  if (type === 'text') {
    container.innerHTML = `
      <input type="text" class="row-text-input input-field flex-1 h-10 rounded-lg text-white text-sm px-3" placeholder="Enter text"/>
    `;
  } else if (type === 'score') {
    container.innerHTML = `
      <input type="text" class="row-score-name input-field flex-1 h-10 rounded-lg text-white text-sm px-3" placeholder="Name (e.g. @s)"/>
      <input type="text" class="row-score-objective input-field flex-1 h-10 rounded-lg text-white text-sm px-3" placeholder="Objective (e.g. money)"/>
    `;
  } else if (type === 'selector') {
    container.innerHTML = `
      <input type="text" class="row-selector-input input-field flex-1 h-10 rounded-lg text-white text-sm px-3" placeholder="Selector (e.g. @s)"/>
    `;
  }

  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', generateCommand);
  });
}

function getRowData(row) {
  const type = row.querySelector('.row-type').value;
  const fieldsContainer = row.querySelector('.row-fields');

  if (type === 'text') {
    const textInput = fieldsContainer.querySelector('.row-text-input');
    const text = textInput ? textInput.value : '';
    if (!text) return null;
    return { text: text };
  } else if (type === 'score') {
    const nameInput = fieldsContainer.querySelector('.row-score-name');
    const objectiveInput = fieldsContainer.querySelector('.row-score-objective');
    const name = nameInput ? nameInput.value : '';
    const objective = objectiveInput ? objectiveInput.value : '';
    if (!name || !objective) return null;
    return { score: { name: name, objective: objective } };
  } else if (type === 'selector') {
    const selectorInput = fieldsContainer.querySelector('.row-selector-input');
    const selector = selectorInput ? selectorInput.value : '';
    if (!selector) return null;
    return { selector: selector };
  }

  return null;
}

function generateCommand() {
  const target = targetInput.value || '@s';
  const displayType = displayTypeSelect.value || 'actionbar';
  const rows = rowsContainer.querySelectorAll('.scoreboard-row');

  const rawtext = [];
  rows.forEach(row => {
    const data = getRowData(row);
    if (data) {
      rawtext.push(data);
    }
  });

  if (rawtext.length === 0) {
    outputTextarea.value = '';
    return;
  }

  const command = `titleraw ${target} ${displayType} ${JSON.stringify({ rawtext: rawtext })}`;
  outputTextarea.value = command;
}

function addRow() {
  rowCounter++;
  const row = createRowElement(rowCounter);
  rowsContainer.appendChild(row);
  generateCommand();
}

addRowButton.addEventListener('click', addRow);

copyButton.addEventListener('click', async () => {
  const command = outputTextarea.value;
  if (!command) {
    return;
  }

  try {
    await navigator.clipboard.writeText(command);
    const originalText = copyButton.querySelector('span:last-child').textContent;
    copyButton.querySelector('span:last-child').textContent = 'Copied!';
    copyButton.classList.add('bg-green-500/20', 'border-green-500/50');
    setTimeout(() => {
      copyButton.querySelector('span:last-child').textContent = originalText;
      copyButton.classList.remove('bg-green-500/20', 'border-green-500/50');
    }, 2000);
  } catch (err) {
    outputTextarea.select();
    document.execCommand('copy');
  }
});

targetInput.addEventListener('input', generateCommand);
displayTypeSelect.addEventListener('change', generateCommand);

function openScoreboardHelpModal() {
  const modal = document.getElementById('help-modal');
  const content = document.getElementById('help-modal-content');

  content.innerHTML = `
    <h3 class="text-xl font-bold text-white mb-2">Scoreboard Builder</h3>
    <p class="mb-4 leading-snug">Build titleraw commands for Minecraft Bedrock Edition to display custom text, scores, and selectors on the player's screen.</p>

    <h3 class="text-xl font-bold text-white mb-2">Row Types</h3>
    <ul class="list-disc list-inside mb-4 leading-tight">
      <li><strong class="text-white">Text</strong> — Plain text content. Use <code class="bg-[#2a2d3a] px-1 rounded">\\n</code> for new lines.</li>
      <li><strong class="text-white">Score</strong> — Display a scoreboard value. Requires a target selector and objective name.</li>
      <li><strong class="text-white">Selector</strong> — Display entity names that match a selector.</li>
    </ul>

    <h3 class="text-xl font-bold text-white mb-2">Display Types</h3>
    <ul class="list-disc list-inside mb-4 leading-tight">
      <li><strong class="text-white">Actionbar</strong> — Shows above the hotbar (recommended for HUDs)</li>
      <li><strong class="text-white">Title</strong> — Large text in center of screen</li>
      <li><strong class="text-white">Subtitle</strong> — Smaller text below title</li>
    </ul>

    <h3 class="text-xl font-bold text-white mb-2">Example</h3>
    <p class="leading-snug mb-2">A command showing "Gold: " followed by a score, then a new line with the player's name:</p>
    <div class="bg-[#2a2d3a] p-3 rounded-lg text-sm font-mono break-all">
      titleraw @s actionbar {"rawtext":[{"text":"Gold: "},{"score":{"name":"@s","objective":"gold"}},{"text":"\\n"},{"selector":"@s"}]}
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

helpButton.addEventListener('click', openScoreboardHelpModal);

addRow();
