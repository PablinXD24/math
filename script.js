document.addEventListener('DOMContentLoaded', () => {
    // Configuração da API
    const TMDB_API_KEY = 'babaa12ae3789f315a1195a801f3c847';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/185x278?text=No+poster';

    // Elementos DOM
    const elements = {
        movie1: {
            search: document.getElementById('movie1-search'),
            results: document.getElementById('movie1-results'),
            selected: document.getElementById('movie1-selected'),
            poster: document.getElementById('movie1-poster'),
            title: document.getElementById('movie1-title'),
            year: document.getElementById('movie1-year')
        },
        movie2: {
            search: document.getElementById('movie2-search'),
            results: document.getElementById('movie2-results'),
            selected: document.getElementById('movie2-selected'),
            poster: document.getElementById('movie2-poster'),
            title: document.getElementById('movie2-title'),
            year: document.getElementById('movie2-year')
        },
        recommendBtn: document.getElementById('recommend-btn'),
        recommendations: {
            container: document.getElementById('recommendations'),
            list: document.getElementById('recommendations-list')
        },
        buttonText: document.querySelector('.button-text'),
        buttonLoader: document.querySelector('.button-loader')
    };

    // Estado da aplicação
    const state = {
        selectedMovie1: null,
        selectedMovie2: null,
        searchTimeout: null
    };

    // Inicialização
    init();

    function init() {
        setupSearch('movie1');
        setupSearch('movie2');
        setupRecommendButton();
    }

    function setupSearch(movieNum) {
        const { search, results } = elements[movieNum];

        search.addEventListener('input', () => handleSearchInput(movieNum));
        
        document.addEventListener('click', (e) => {
            if (!results.contains(e.target) && e.target !== search) {
                results.style.display = 'none';
            }
        });
    }

    async function handleSearchInput(movieNum) {
        clearTimeout(state.searchTimeout);
        
        const { search, results } = elements[movieNum];
        const query = search.value.trim();
        
        if (query.length < 2) {
            results.style.display = 'none';
            return;
        }
        
        state.searchTimeout = setTimeout(async () => {
            try {
                const movies = await searchMovies(query);
                displaySearchResults(movieNum, movies);
            } catch (error) {
                console.error('Erro na busca:', error);
                showSearchError(movieNum);
            }
        }, 500);
    }

    async function searchMovies(query) {
        const response = await fetch(
            `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`
        );
        const data = await response.json();
        return data.results;
    }

    function displaySearchResults(movieNum, movies) {
        const { results } = elements[movieNum];
        results.innerHTML = '';
        
        if (!movies || movies.length === 0) {
            results.innerHTML = '<div class="movie-result">Nenhum filme encontrado</div>';
            results.style.display = 'block';
            return;
        }
        
        movies.slice(0, 5).forEach(movie => {
            const movieElement = createMovieResultElement(movie, movieNum);
            results.appendChild(movieElement);
        });
        
        results.style.display = 'block';
    }

    function createMovieResultElement(movie, movieNum) {
        const { search, results } = elements[movieNum];
        const posterPath = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
            : 'https://via.placeholder.com/45x67?text=No+poster';
        
        const movieElement = document.createElement('div');
        movieElement.className = 'movie-result';
        movieElement.innerHTML = `
            <img src="${posterPath}" alt="${movie.title}">
            <div>
                <strong>${movie.title}</strong>
                <div>${movie.release_date ? movie.release_date.substring(0, 4) : 'Ano desconhecido'}</div>
            </div>
        `;
        
        movieElement.addEventListener('click', () => {
            selectMovie(movieNum, {
                id: movie.id,
                title: movie.title,
                year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
                poster: movie.poster_path 
                    ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
                    : PLACEHOLDER_IMAGE,
                genres: movie.genre_ids || []
            });
            
            results.style.display = 'none';
            search.value = movie.title;
        });
        
        return movieElement;
    }

    function showSearchError(movieNum) {
        const { results } = elements[movieNum];
        results.innerHTML = '<div class="movie-result error-message">Erro ao buscar filmes</div>';
        results.style.display = 'block';
    }

    function selectMovie(movieNum, movie) {
        state[`selectedMovie${movieNum.slice(-1)}`] = movie;
        displaySelectedMovie(movieNum);
        checkRecommendButton();
    }

    function displaySelectedMovie(movieNum) {
        const { selected, poster, title, year } = elements[movieNum];
        const movie = state[`selectedMovie${movieNum.slice(-1)}`];
        
        poster.src = movie.poster;
        poster.alt = `Poster de ${movie.title}`;
        title.textContent = movie.title;
        year.textContent = movie.year;
        selected.style.display = 'flex';
    }

    function setupRecommendButton() {
        elements.recommendBtn.addEventListener('click', handleRecommendation);
    }

    async function handleRecommendation() {
        if (!state.selectedMovie1 || !state.selectedMovie2) return;
        
        showLoading(true);
        elements.recommendations.container.style.display = 'none';
        
        try {
            const recommendations = await getHybridRecommendations();
            displayRecommendations(recommendations);
        } catch (error) {
            console.error('Erro ao obter recomendações:', error);
            showRecommendationError();
        } finally {
            showLoading(false);
            elements.recommendations.container.style.display = 'block';
        }
    }

    function showLoading(show) {
        if (show) {
            elements.buttonText.style.visibility = 'hidden';
            elements.buttonLoader.style.display = 'block';
            elements.recommendBtn.disabled = true;
        } else {
            elements.buttonText.style.visibility = 'visible';
            elements.buttonLoader.style.display = 'none';
            checkRecommendButton();
        }
    }

    async function getHybridRecommendations() {
        const [movie1Details, movie2Details] = await Promise.all([
            getMovieDetails(state.selectedMovie1.id),
            getMovieDetails(state.selectedMovie2.id)
        ]);
        
        const combinedGenres = [
            ...new Set([
                ...movie1Details.genres.map(g => g.id),
                ...movie2Details.genres.map(g => g.id)
            ])
        ];
        
        const recommendations = await discoverMovies({
            with_genres: combinedGenres.join(','),
            sort_by: 'popularity.desc',
            language: 'pt-BR'
        });
        
        return recommendations.results.filter(movie => 
            movie.id !== state.selectedMovie1.id && 
            movie.id !== state.selectedMovie2.id
        ).slice(0, 5);
    }

    async function getMovieDetails(movieId) {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=pt-BR`
        );
        return await response.json();
    }

    async function discoverMovies(params) {
        const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        
        const response = await fetch(
            `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&${queryString}`
        );
        return await response.json();
    }

    function displayRecommendations(recommendations) {
        elements.recommendations.list.innerHTML = '';
        
        if (!recommendations || recommendations.length === 0) {
            elements.recommendations.list.innerHTML = 
                '<p class="no-results">Não encontramos recomendações para essa combinação. Tente outros filmes!</p>';
            return;
        }
        
        recommendations.forEach(movie => {
            const recommendationElement = createRecommendationElement(movie);
            elements.recommendations.list.appendChild(recommendationElement);
        });
        
        triggerConfetti();
    }

    function createRecommendationElement(movie) {
        const posterPath = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
            : PLACEHOLDER_IMAGE;
        
        const element = document.createElement('div');
        element.className = 'recommendation';
        element.innerHTML = `
            <img src="${posterPath}" alt="${movie.title}">
            <div class="recommendation-info">
                <div class="recommendation-title">${movie.title} (${movie.release_date ? movie.release_date.substring(0, 4) : 'N/A'})</div>
                <div class="recommendation-overview">${movie.overview || 'Sinopse não disponível.'}</div>
            </div>
        `;
        
        return element;
    }

    function showRecommendationError() {
        elements.recommendations.list.innerHTML = 
            '<p class="error-message">Ocorreu um erro ao buscar recomendações. Por favor, tente novamente.</p>';
    }

    function checkRecommendButton() {
        elements.recommendBtn.disabled = !(state.selectedMovie1 && state.selectedMovie2);
    }

    function triggerConfetti() {
        if (typeof confetti === 'function') {
            launchConfetti();
        } else {
            loadConfettiScript();
        }
    }

    function launchConfetti() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#4361ee', '#3a0ca3', '#f72585', '#4cc9f0', '#7209b7']
        });
    }

    function loadConfettiScript() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
        script.onload = launchConfetti;
        document.head.appendChild(script);
    }
});
