const runBtn = document.getElementById('runBtn');
const nlpRunBtn = document.getElementById('nlpRunBtn');
const queryInput = document.getElementById('queryInput');
const nlpInput = document.getElementById('nlpInput');
const resultDiv = document.getElementById('result');
const statusDiv = document.getElementById('status');
const serverStatus = document.getElementById('serverStatus');
const generatedSqlContainer = document.getElementById('generatedSqlContainer');
const generatedSqlText = document.getElementById('generatedSql');

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    if (tab === 'raw') {
        document.getElementById('rawTab').classList.remove('hidden');
        document.querySelector('[onclick="switchTab(\'raw\')"]').classList.add('active');
    } else {
        document.getElementById('nlpTab').classList.remove('hidden');
        document.querySelector('[onclick="switchTab(\'nlp\')"]').classList.add('active');
    }
}

async function checkStatus() {
    try {
        const res = await fetch('/api/ping');
        if (res.ok) {
            serverStatus.innerHTML = '<span style="color: #4ade80;">● Online</span>';
        } else {
            serverStatus.innerHTML = '<span style="color: #fb7185;">● Error</span>';
        }
    } catch (err) {
        serverStatus.innerHTML = '<span style="color: #94a3b8;">● Offline</span>';
    }
}

async function handleQuery(endpoint, body) {
    resultDiv.innerHTML = '';
    generatedSqlContainer.style.display = 'none';
    statusDiv.innerHTML = '<div style="margin-top: 20px; color: #94a3b8;">Processing query...</div>';
    
    runBtn.disabled = true;
    nlpRunBtn.disabled = true;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.success) {
            if (result.generatedSQL) {
                generatedSqlContainer.style.display = 'block';
                generatedSqlText.textContent = result.generatedSQL;
            }

            let statusMsg = `<div class="success-msg"><strong>Success!</strong> Affected: ${result.rowsAffected}`;
            if (result.totalRows !== undefined) {
                statusMsg += ` | Found: ${result.totalRows}`;
            }
            if (result.truncated) {
                statusMsg += ` <br><small>Showing first 5,000 rows (performance limit).</small>`;
            }
            statusMsg += `</div>`;
            
            statusDiv.innerHTML = statusMsg;

            if (result.data && result.data.length > 0) {
                renderTable(result.data);
            } else {
                resultDiv.innerHTML = '<div style="padding: 20px; color: #94a3b8; text-align: center;">No rows returned.</div>';
            }
        } else {
            const typeLabel = result.errorType ? `<strong>${result.errorType}</strong><br>` : '';
            statusDiv.innerHTML = `<div class="error">${typeLabel}${result.error}</div>`;
        }
    } catch (err) {
        statusDiv.innerHTML = `<div class="error"><strong>Network Error</strong><br>Could not reach the backend.</div>`;
    } finally {
        runBtn.disabled = false;
        nlpRunBtn.disabled = false;
    }
}

function renderTable(data) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] === null ? 'NULL' : row[header];
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    resultDiv.appendChild(table);
}

// Event Listeners
runBtn.addEventListener('click', () => {
    const query = queryInput.value.trim();
    if (!query) return alert('Enter a query');
    handleQuery('/api/query', { query });
});

nlpRunBtn.addEventListener('click', () => {
    const prompt = nlpInput.value.trim();
    if (!prompt) return alert('Ask something');
    handleQuery('/api/nlp-query', { prompt });
});

// Initial check
checkStatus();
