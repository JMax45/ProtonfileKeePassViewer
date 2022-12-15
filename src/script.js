import * as kdbxweb from 'kdbxweb';

const htmlContainer = `
<div id="plugin-container">
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
`

let db;
let currentSelectedElement;
async function load(element, url) {
	element.innerHTML = htmlContainer;
	const blob = await(await fetch(url)).blob();
	const password = prompt("Enter in the password");
	const credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password));
	db = await kdbxweb.Kdbx.load(await blob.arrayBuffer(), credentials);

	const mainGroup = db.getDefaultGroup();
	displayRecursive(mainGroup, 0, document.getElementById("plugin-list"));
	var toggler = document.querySelectorAll(".caret .arrow");
	var i;

	for (i = 0; i < toggler.length; i++) {
	  toggler[i].addEventListener("click", function() {
		this.parentElement.parentElement.querySelector(".nested").classList.toggle("active");
		this.classList.toggle("caret-down");
	  });
	}
}
function selectHandler(group) {
	if(currentSelectedElement) currentSelectedElement.classList.toggle("selected");
	this.classList.toggle("selected");
	currentSelectedElement = this;
	updateTable(group);
}
function updateTable(group) {
	const table = document.querySelector('#plugin-entries tbody');
	table.innerHTML = '';
	for(const entry of group.entries) {
		const tr = document.createElement('tr');
		const td1 = document.createElement('td');
		const td2 = document.createElement('td');
		const td3 = document.createElement('td');
		td1.textContent = entry.fields.get('Title');
		td2.textContent = entry.fields.get('UserName');
		td2.style.cursor = 'pointer';
		td2.addEventListener('click', function(event) {
			navigator.clipboard.writeText(entry.fields.get('UserName'));
			const x = event.clientX;
			const y = event.clientY;
			const tooltip = document.querySelector('.tooltiptext');
			tooltip.style.top = y - 50;
			tooltip.style.left = x;
			tooltip.classList.remove('tooltiptext-enabled');
			if(clipboardHandle) clearTimeout(clipboardHandle);
			tooltip.classList.add('tooltiptext-enabled');
			clipboardHandle = setTimeout(() => tooltip.classList.toggle('tooltiptext-enabled'), 1000);
		});
		td3.textContent = entry.fields.get('Password') 
			? "*".repeat(entry.fields.get('Password').getText().length) 
			: '';
		td3.style.cursor = 'pointer';
		td3.addEventListener('click', function(event) {
			navigator.clipboard.writeText(entry.fields.get('Password').getText());
			const x = event.clientX;
			const y = event.clientY;
			const tooltip = document.querySelector('.tooltiptext');
			tooltip.style.top = y - 50;
			tooltip.style.left = x;
			tooltip.classList.remove('tooltiptext-enabled');
			if(clipboardHandle) clearTimeout(clipboardHandle);
			tooltip.classList.add('tooltiptext-enabled');
			clipboardHandle = setTimeout(() => tooltip.classList.toggle('tooltiptext-enabled'), 1000);
		});
		tr.appendChild(td1);
		tr.appendChild(td2);
		tr.appendChild(td3);
		table.appendChild(tr);
	}
}
let clipboardHandle;
function displayRecursive(group, indentation, parentElement) {
	if(group.groups.length > 0) {
		const li = document.createElement('li');
		const span = document.createElement('span');
		const span2 = document.createElement('span');
		const span3 = document.createElement('span');
		span.classList.add('caret');
		span.appendChild(span2);
		span2.classList.add('arrow');
		span.appendChild(span3);
		span3.appendChild(document.createTextNode(group.name));
		span3.addEventListener("click", function() { selectHandler.bind(this, group)() });
		li.appendChild(span);
		parentElement.appendChild(li);
		const ul = document.createElement('ul');
		ul.classList.add('nested');
		li.appendChild(ul);
		for(const e of group.groups) {
			displayRecursive(e, indentation+1, ul);
		}
		if(indentation === 0) {
			selectHandler.bind(span3, group)();
			span2.classList.add('caret-down');
			span3.parentElement.parentElement.querySelector(".nested").classList.toggle("active");
			span3.classList.toggle("caret-down");
		}
		return;
	}
	const li = document.createElement("li");
	const span = document.createElement('span');
	span.appendChild(document.createTextNode(group.name));
	span.addEventListener("click", function() { selectHandler.bind(this, group)() });
	li.appendChild(span);
	parentElement.appendChild(li);
}

window.Protonfile.FileViewer.supportedFormats.add('kdbx', '<i class="fa-solid fa-vault" />');

(async() => {
	window.Protonfile.FileViewer.on('open', async (file, element) => {
		if(file.extension !== 'kdbx') return;
		console.log('listener', file, element);
		load(element, await window.Protonfile.File.getSignedUrl(file));
	})
})()