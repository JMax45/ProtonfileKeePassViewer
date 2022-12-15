import * as kdbxweb from 'kdbxweb';

const htmlContainer = `
<div id="plugin-container">
  <div class="master-key-input">
    <form>
      <label for="masterKey">Enter password:</label>
      <br><br>
      <input type="password" id="masterKey" name="masterKey">
      <p class="wrong-password" style="color: red; display: none;">Wrong password, please retry</p>
    </form>
  </div>
  <div class="main-panel main-panel-disabled">
    <ul id="plugin-list"></ul>
    <div id="plugin-entries">
      <table>
        <thead>
            <tr>
                <th>Title</th>
                <th>Username</th>
                <th>Password</th>
            </tr>
        </thead>
        <span class="tooltiptext">Copied to clipboard</span>
        <tbody></tbody>
      </table>
    </div>
  </div>
</div>
`;

let db;
let currentSelectedElement;
async function load(element, url) {
  element.innerHTML = htmlContainer;
  const blob = await (await fetch(url)).blob();

  document
    .querySelector('#plugin-container .master-key-input form')
    .addEventListener('submit', function (event) {
      event.preventDefault();
      decrypt(
        blob,
        document.querySelector('#plugin-container .master-key-input form input')
          .value
      );
    });
}
async function decrypt(blob, masterKey) {
  const credentials = new kdbxweb.Credentials(
    kdbxweb.ProtectedValue.fromString(masterKey)
  );

  try {
    db = await kdbxweb.Kdbx.load(await blob.arrayBuffer(), credentials);
    document.querySelector(
      '#plugin-container .master-key-input'
    ).style.display = 'none';
    const mainPanel = document.querySelector('#plugin-container .main-panel');
    mainPanel.classList.remove('main-panel-disabled');
    mainPanel.classList.add('main-panel-enabled');
  } catch (err) {
    document.querySelector(
      '#plugin-container .master-key-input form .wrong-password'
    ).style.display = 'block';
    return;
  }

  const mainGroup = db.getDefaultGroup();
  displayRecursive(mainGroup, 0, document.getElementById('plugin-list'));
  var toggler = document.querySelectorAll('.caret .arrow');
  var i;

  for (i = 0; i < toggler.length; i++) {
    toggler[i].addEventListener('click', function () {
      this.parentElement.parentElement
        .querySelector('.nested')
        .classList.toggle('active');
      this.classList.toggle('caret-down');
    });
  }
}
function selectHandler(group) {
  if (currentSelectedElement)
    currentSelectedElement.classList.toggle('selected');
  this.classList.toggle('selected');
  currentSelectedElement = this;
  updateTable(group);
}
function handleClipboardCopy(event, entry, entryField) {
  navigator.clipboard.writeText(entry.fields.get(entryField).getText());
  const x = event.clientX;
  const y = event.clientY;
  const tooltip = document.querySelector('.tooltiptext');
  tooltip.style.top = `${y - 50}px`;
  tooltip.style.left = `${x}px`;
  tooltip.classList.remove('tooltiptext-enabled');
  if (clipboardHandle) clearTimeout(clipboardHandle);
  tooltip.classList.add('tooltiptext-enabled');
  clipboardHandle = setTimeout(
    () => tooltip.classList.toggle('tooltiptext-enabled'),
    1000
  );
}
function updateTable(group) {
  const table = document.querySelector('#plugin-entries tbody');
  table.innerHTML = '';
  for (const entry of group.entries) {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    const td3 = document.createElement('td');
    td1.textContent = entry.fields.get('Title');
    td2.textContent = entry.fields.get('UserName');
    td2.style.cursor = 'pointer';
    td2.addEventListener('click', (event) =>
      handleClipboardCopy(event, entry, 'UserName')
    );
    td3.textContent = entry.fields.get('Password')
      ? '*'.repeat(entry.fields.get('Password').getText().length)
      : '';
    td3.style.cursor = 'pointer';
    td3.addEventListener('click', (event) =>
      handleClipboardCopy(event, entry, 'Password')
    );
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    table.appendChild(tr);
  }
}
let clipboardHandle;
function displayRecursive(group, indentation, parentElement) {
  if (group.groups.length > 0) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    const span2 = document.createElement('span');
    const span3 = document.createElement('span');
    span.classList.add('caret');
    span.appendChild(span2);
    span2.classList.add('arrow');
    span.appendChild(span3);
    span3.appendChild(document.createTextNode(group.name));
    span3.addEventListener('click', function () {
      selectHandler.bind(this, group)();
    });
    li.appendChild(span);
    parentElement.appendChild(li);
    const ul = document.createElement('ul');
    ul.classList.add('nested');
    li.appendChild(ul);
    for (const e of group.groups) {
      displayRecursive(e, indentation + 1, ul);
    }
    if (indentation === 0) {
      selectHandler.bind(span3, group)();
      span2.classList.add('caret-down');
      span3.parentElement.parentElement
        .querySelector('.nested')
        .classList.toggle('active');
      span3.classList.toggle('caret-down');
    }
    return;
  }
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.appendChild(document.createTextNode(group.name));
  span.addEventListener('click', function () {
    selectHandler.bind(this, group)();
  });
  li.appendChild(span);
  parentElement.appendChild(li);
}

window.Protonfile.FileViewer.supportedFormats.add(
  'kdbx',
  '<i class="fa-solid fa-vault" />'
);

(async () => {
  window.Protonfile.FileViewer.on('open', async (file, element) => {
    if (file.extension !== 'kdbx') return;
    console.log('listener', file, element);
    load(element, await window.Protonfile.File.getSignedUrl(file));
  });
})();
