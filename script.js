// Configuração da API do TMDB
// OBTENHA SUA PRÓPRIA CHAVE EM: https://www.themoviedb.org/settings/api
const TMDB_API_KEY = 'babaa12ae3789f315a1195a801f3c847'; // Substitua por sua chave
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Elementos do DOM
const movie1Search = document.getElementById('movie1-search');
const movie1Results = document.getElementById('movie1-results');
const movie1Selected = document.getElementById('movie1-selected');
const movie1Poster = document.getElementById('movie1-poster');
const movie1Title = document.getElementById('movie1-title');
const movie1Year = document.getElementById('movie1-year');

const movie2Search = document.getElementById('movie2-search');
const movie2Results = document.getElementById('movie2-results');
const movie2Selected = document.getElementById('movie2-selected');
const movie2Poster = document.getElementById('movie2-poster');
const movie2Title = document.getElementById('movie2-title');
const movie2Year = document.getElementById('movie2-year');

const recommendBtn = document.getElementById('recommend-btn');
const loadingDiv = document.getElementById('loading');
const recommendationsDiv = document.getElementById('recommendations');
const recommendationsList = document.getElementById('recommendations-list');

// Filmes selecionados
let selectedMovie1 = null;
let selectedMovie2 = null;

// Configurar listeners de busca
setupSearch(movie1Search, movie1Results, (movie) => {
    selectedMovie1 = movie;
    displaySelectedMovie(movie, movie1Selected, movie1Poster, movie1Title, movie1Year);
    checkRecommendButton();
});

setupSearch(movie2Search, movie2Results, (movie) => {
    selectedMovie2 = movie;
    displaySelectedMovie(movie, movie2Selected, movie2Poster, movie2Title, movie2Year);
    checkRecommendButton();
});

// Configurar botão de recomendação
recommendBtn.addEventListener('click', async () => {
    if (!selectedMovie1 || !selectedMovie2) return;
    
    // Mostrar loading
    loadingDiv.style.display = 'block';
    recommendationsDiv.style.display = 'none';
    
    try {
        // Obter recomendações híbridas
        const recommendations = await getHybridRecommendations(selectedMovie1, selectedMovie2);
        displayRecommendations(recommendations);
    } catch (error) {
        console.error('Erro ao obter recomendações:', error);
        recommendationsList.innerHTML = '<p>Ocorreu um erro ao buscar recomendações. Por favor, tente novamente.</p>';
    } finally {
        loadingDiv.style.display = 'none';
        recommendationsDiv.style.display = 'block';
    }
});

// Função para configurar a busca de filmes
function setupSearch(inputElement, resultsContainer, onSelect) {
    let timeoutId;
    
    inputElement.addEventListener('input', () => {
        clearTimeout(timeoutId);
        const query = inputElement.value.trim();
        
        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        timeoutId = setTimeout(async () => {
            try {
                const movies = await searchMovies(query);
                displaySearchResults(movies, resultsContainer, onSelect);
            } catch (error) {
                console.error('Erro na busca:', error);
                resultsContainer.innerHTML = '<div class="movie-result">Erro ao buscar filmes</div>';
                resultsContainer.style.display = 'block';
            }
        }, 500);
    });
    
    // Esconder resultados quando clicar fora
    document.addEventListener('click', (e) => {
        if (!resultsContainer.contains(e.target) && e.target !== inputElement) {
            resultsContainer.style.display = 'none';
        }
    });
}

// Buscar filmes na API do TMDB
async function searchMovies(query) {
    const response = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`);
    const data = await response.json();
    return data.results;
}

// Exibir resultados da busca
function displaySearchResults(movies, container, onSelect) {
    container.innerHTML = '';
    
    if (movies.length === 0) {
        container.innerHTML = '<div class="movie-result">Nenhum filme encontrado</div>';
        container.style.display = 'block';
        return;
    }
    
    movies.slice(0, 5).forEach(movie => {
        const movieElement = document.createElement('div');
        movieElement.className = 'movie-result';
        
        const posterPath = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
            : 'https://via.placeholder.com/40x60?text=No+poster';
        
        movieElement.innerHTML = `
            <img src="${posterPath}" alt="${movie.title}">
            <div>
                <strong>${movie.title}</strong>
                <div>${movie.release_date ? movie.release_date.substring(0, 4) : 'Ano desconhecido'}</div>
            </div>
        `;
        
        movieElement.addEventListener('click', () => {
            onSelect({
                id: movie.id,
                title: movie.title,
                year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
                poster: movie.poster_path 
                    ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
                    : 'https://via.placeholder.com/185x278?text=No+poster',
                genres: movie.genre_ids || []
            });
            
            container.style.display = 'none';
            container.previousElementSibling.value = movie.title;
        });
        
        container.appendChild(movieElement);
    });
    
    container.style.display = 'block';
}

// Exibir filme selecionado
function displaySelectedMovie(movie, container, posterElement, titleElement, yearElement) {
    posterElement.src = movie.poster;
    titleElement.textContent = movie.title;
    yearElement.textContent = movie.year;
    container.style.display = 'flex';
}

// Verificar se o botão de recomendação deve ser ativado
function checkRecommendButton() {
    recommendBtn.disabled = !(selectedMovie1 && selectedMovie2);
}

// Obter recomendações híbridas (simulação - na prática seria uma combinação de gêneros/palavras-chave)
async function getHybridRecommendations(movie1, movie2) {
    // Primeiro, obtemos detalhes dos filmes selecionados para pegar gêneros
    const [movie1Details, movie2Details] = await Promise.all([
        getMovieDetails(movie1.id),
        getMovieDetails(movie2.id)
    ]);
    
    // Combinamos os gêneros dos dois filmes
    const combinedGenres = [...new Set([
        ...(movie1Details.genres.map(g => g.id)),
        ...(movie2Details.genres.map(g => g.id))
    ])];
    
    // Buscamos filmes que compartilham esses gêneros
    const recommendations = await discoverMovies({
        with_genres: combinedGenres.join(','),
        sort_by: 'popularity.desc',
        language: 'pt-BR'
    });
    
    // Removemos os filmes originais das recomendações
    return recommendations.results.filter(movie => 
        movie.id !== movie1.id && movie.id !== movie2.id
    ).slice(0, 5); // Limitamos a 5 recomendações
}

// Obter detalhes de um filme
async function getMovieDetails(movieId) {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
    return await response.json();
}

// Descobrir filmes com critérios específicos
async function discoverMovies(params) {
    const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
    
    const response = await fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&${queryString}`);
    return await response.json();
}

// Exibir recomendações
function displayRecommendations(recommendations) {
    recommendationsList.innerHTML = '';
    
    if (recommendations.length === 0) {
        recommendationsList.innerHTML = '<p>Não encontramos recomendações para essa combinação. Tente outros filmes!</p>';
        return;
    }
    
    recommendations.forEach(movie => {
        const posterPath = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
            : 'https://via.placeholder.com/185x278?text=No+poster';
        
        const recommendationElement = document.createElement('div');
        recommendationElement.className = 'recommendation';
        
        recommendationElement.innerHTML = `
            <img src="${posterPath}" alt="${movie.title}">
            <div class="recommendation-info">
                <div class="recommendation-title">${movie.title} (${movie.release_date ? movie.release_date.substring(0, 4) : 'N/A'})</div>
                <div class="recommendation-overview">${movie.overview || 'Sinopse não disponível.'}</div>
            </div>
        `;
        
        recommendationsList.appendChild(recommendationElement);
    });
}
