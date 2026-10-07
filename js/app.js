/**
 * FetchJS.guide - JavaScript Application Logic
 * Explaining and Demonstrating JS Fetch API with PokéAPI (Ditto)
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const pokemonInput = document.getElementById('pokemonInput');
    const btnFetchAsync = document.getElementById('btnFetchAsync');
    const btnFetchPromises = document.getElementById('btnFetchPromises');
    const metricsBar = document.getElementById('metricsBar');
    const metricStatus = document.getElementById('metricStatus');
    const metricTime = document.getElementById('metricTime');
    const metricType = document.getElementById('metricType');
    const metricMode = document.getElementById('metricMode');
    const pokemonCardDisplay = document.getElementById('pokemonCardDisplay');
    const jsonOutput = document.getElementById('jsonOutput');
    const codeSnippetContent = document.getElementById('codeSnippetContent');
    const codeTitle = document.getElementById('codeTitle');
    const btnCopyJson = document.getElementById('btnCopyJson');
    const btnCopyCode = document.getElementById('btnCopyCode');

    // Type Color Mapping for badges
    const typeColors = {
        normal: '#A8A77A',
        fire: '#EE8130',
        water: '#6390F0',
        electric: '#F7D02C',
        grass: '#7AC74C',
        ice: '#96D9D6',
        fighting: '#C22E28',
        poison: '#A33EA0',
        ground: '#E2BF65',
        flying: '#A98FF3',
        psychic: '#F95587',
        bug: '#A6B91A',
        rock: '#B6A136',
        ghost: '#735797',
        dragon: '#6F35FC',
        steel: '#B7B7CE',
        fairy: '#D685AD'
    };

    let lastFetchedJsonString = '';

    // Initialize Event Listeners
    btnFetchAsync.addEventListener('click', () => fetchPokemonAsync(pokemonInput.value.trim().toLowerCase()));
    btnFetchPromises.addEventListener('click', () => fetchPokemonPromises(pokemonInput.value.trim().toLowerCase()));
    
    // Trigger search on Enter key
    pokemonInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchPokemonAsync(pokemonInput.value.trim().toLowerCase());
        }
    });

    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Copy to Clipboard buttons
    btnCopyJson.addEventListener('click', () => {
        if (!lastFetchedJsonString) return;
        navigator.clipboard.writeText(lastFetchedJsonString).then(() => {
            const originalText = btnCopyJson.textContent;
            btnCopyJson.textContent = '✅ ¡Copiado!';
            setTimeout(() => btnCopyJson.textContent = originalText, 2000);
        });
    });

    btnCopyCode.addEventListener('click', () => {
        const codeText = codeSnippetContent.textContent;
        navigator.clipboard.writeText(codeText).then(() => {
            const originalText = btnCopyCode.textContent;
            btnCopyCode.textContent = '✅ ¡Copiado!';
            setTimeout(() => btnCopyCode.textContent = originalText, 2000);
        });
    });

    /**
     * Option 1: Fetch using async / await
     */
    async function fetchPokemonAsync(query = 'ditto') {
        const targetQuery = query || 'ditto';
        const url = `https://pokeapi.co/api/v2/pokemon/${targetQuery}`;

        showLoadingState();
        updateCodeDisplayAsync(targetQuery);

        const startTime = performance.now();

        try {
            // Step 1: Execute fetch HTTP GET request
            const response = await fetch(url);
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);

            // Step 2: Check HTTP status
            if (!response.ok) {
                updateMetrics(response.status, `${response.status} ${response.statusText}`, latency, 'async/await', false);
                throw new Error(`Pokémon "${targetQuery}" no encontrado (Código HTTP ${response.status})`);
            }

            // Step 3: Parse JSON response
            const data = await response.json();

            // Update Metrics Bar
            updateMetrics(response.status, `${response.status} OK`, latency, 'async/await', true);

            // Render Results
            renderPokemonCard(data);
            renderJsonOutput(data);

        } catch (error) {
            renderErrorState(error.message);
            jsonOutput.textContent = `// Error:\n${error.message}`;
        }
    }

    /**
     * Option 2: Fetch using traditional Promises (.then / .catch)
     */
    function fetchPokemonPromises(query = 'ditto') {
        const targetQuery = query || 'ditto';
        const url = `https://pokeapi.co/api/v2/pokemon/${targetQuery}`;

        showLoadingState();
        updateCodeDisplayPromises(targetQuery);

        const startTime = performance.now();

        fetch(url)
            .then(response => {
                const endTime = performance.now();
                const latency = Math.round(endTime - startTime);

                if (!response.ok) {
                    updateMetrics(response.status, `${response.status} ${response.statusText}`, latency, '.then() / Promesas', false);
                    throw new Error(`Pokémon "${targetQuery}" no encontrado (Código HTTP ${response.status})`);
                }

                updateMetrics(response.status, `${response.status} OK`, latency, '.then() / Promesas', true);
                return response.json();
            })
            .then(data => {
                renderPokemonCard(data);
                renderJsonOutput(data);
            })
            .catch(error => {
                renderErrorState(error.message);
                jsonOutput.textContent = `// Error:\n${error.message}`;
            });
    }

    // UI Helper Functions

    function showLoadingState() {
        metricsBar.classList.remove('hidden');
        pokemonCardDisplay.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
                <p>Realizando petición <code>fetch()</code> a PokéAPI...</p>
            </div>
        `;
        jsonOutput.textContent = '// Cargando datos del servidor...';
    }

    function updateMetrics(status, statusText, latency, mode, isSuccess) {
        metricStatus.textContent = statusText;
        metricStatus.className = isSuccess ? 'badge badge-success' : 'badge badge-danger';
        metricTime.textContent = `${latency} ms`;
        metricType.textContent = 'application/json';
        metricMode.textContent = mode;
    }

    function renderPokemonCard(data) {
        const name = data.name;
        const id = `#${String(data.id).padStart(3, '0')}`;
        const artwork = data.sprites.other?.['official-artwork']?.front_default || data.sprites.front_default;
        const typesHtml = data.types.map(t => {
            const typeName = t.type.name;
            const color = typeColors[typeName] || '#777';
            return `<span class="type-tag" style="background:${color}33; border-color:${color}; color:${color}">${typeName}</span>`;
        }).join('');

        const abilities = data.abilities.map(a => a.ability.name).join(', ');
        const height = (data.height / 10).toFixed(1) + ' m';
        const weight = (data.weight / 10).toFixed(1) + ' kg';

        // Stats calculation (HP, Attack, Defense, Speed, etc.)
        const statsMap = {};
        data.stats.forEach(s => statsMap[s.stat.name] = s.base_stat);

        pokemonCardDisplay.innerHTML = `
            <div class="pokemon-card">
                <div class="pokemon-img-box">
                    <img src="${artwork}" alt="${name}">
                </div>
                <div class="pokemon-info">
                    <div class="pokemon-title-row">
                        <h3 class="pokemon-name">${name}</h3>
                        <span class="pokemon-id">${id}</span>
                    </div>
                    <div class="types-list">
                        ${typesHtml}
                    </div>

                    <div class="pokemon-stats">
                        <div class="stat-item">
                            <span class="stat-label">Puntos de Vida (HP)</span>
                            <span class="stat-val">${statsMap['hp'] || '-'}</span>
                            <div class="stat-bar-bg">
                                <div class="stat-bar-fill" style="width: ${Math.min(100, ((statsMap['hp'] || 0)/150)*100)}%"></div>
                            </div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Ataque</span>
                            <span class="stat-val">${statsMap['attack'] || '-'}</span>
                            <div class="stat-bar-bg">
                                <div class="stat-bar-fill" style="width: ${Math.min(100, ((statsMap['attack'] || 0)/150)*100)}%"></div>
                            </div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Defensa</span>
                            <span class="stat-val">${statsMap['defense'] || '-'}</span>
                            <div class="stat-bar-bg">
                                <div class="stat-bar-fill" style="width: ${Math.min(100, ((statsMap['defense'] || 0)/150)*100)}%"></div>
                            </div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Velocidad</span>
                            <span class="stat-val">${statsMap['speed'] || '-'}</span>
                            <div class="stat-bar-bg">
                                <div class="stat-bar-fill" style="width: ${Math.min(100, ((statsMap['speed'] || 0)/150)*100)}%"></div>
                            </div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Altura / Peso</span>
                            <span class="stat-val" style="font-size:0.85rem;">${height} / ${weight}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Habilidades</span>
                            <span class="stat-val" style="font-size:0.85rem; text-transform:capitalize;">${abilities}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderJsonOutput(data) {
        lastFetchedJsonString = JSON.stringify(data, null, 2);
        jsonOutput.textContent = lastFetchedJsonString;
    }

    function renderErrorState(message) {
        pokemonCardDisplay.innerHTML = `
            <div class="placeholder-state" style="color: #f87171;">
                <span class="placeholder-icon">⚠️</span>
                <h3>Error en la Petición Fetch</h3>
                <p>${message}</p>
            </div>
        `;
    }

    function updateCodeDisplayAsync(query) {
        codeTitle.textContent = 'Código JavaScript (async / await)';
        codeSnippetContent.textContent = 
`// Petición HTTP usando async / await
async function obtenerPokemon() {
  const url = 'https://pokeapi.co/api/v2/pokemon/${query}';

  try {
    // 1. Iniciar la petición fetch
    const respuesta = await fetch(url);

    // 2. Verificar estado HTTP (200 OK)
    if (!respuesta.ok) {
      throw new Error(\`Error HTTP: \${respuesta.status}\`);
    }

    // 3. Convertir cuerpo de la respuesta a JSON
    const data = await respuesta.json();
    
    console.log('Datos de ${query}:', data);
    return data;
  } catch (error) {
    console.error('Error al realizar fetch:', error);
  }
}

obtenerPokemon();`;
    }

    function updateCodeDisplayPromises(query) {
        codeTitle.textContent = 'Código JavaScript (Promesas .then / .catch)';
        codeSnippetContent.textContent = 
`// Petición HTTP usando Promesas (.then / .catch)
function obtenerPokemonConPromesas() {
  const url = 'https://pokeapi.co/api/v2/pokemon/${query}';

  fetch(url)
    .then(respuesta => {
      // 1. Verificar estado HTTP
      if (!respuesta.ok) {
        throw new Error(\`Error HTTP: \${respuesta.status}\`);
      }
      // 2. Retornar la promesa de transformación a JSON
      return respuesta.json();
    })
    .then(data => {
      console.log('Datos de ${query}:', data);
    })
    .catch(error => {
      console.error('Error al realizar fetch:', error);
    });
}

obtenerPokemonConPromesas();`;
    }

    // Auto-fetch Ditto on page load for immediate WOW effect
    fetchPokemonAsync('ditto');
});
