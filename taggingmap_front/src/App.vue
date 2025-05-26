<template>
  <div id="app">
    <header class="app-header">
      <div class="container">
        <h1 class="app-title">태깅맵 시스템</h1>
        <nav class="main-nav">
          <router-link to="/" class="nav-link">태깅맵 리스트</router-link>
          <span class="nav-separator">|</span>
          <router-link to="/upload" class="nav-link">태깅맵 업로드</router-link>
        </nav>
      </div>
    </header>
    
    <main class="container">
      <router-view />
    </main>
    
    <footer class="app-footer">
      <div class="container">
        <p>&copy; 태깅맵 시스템</p>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App'
};
</script>

<style>
.app-header {
  background-color: #f8f9fa;
  padding: 1rem 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.app-title {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.main-nav {
  margin-top: 0.5rem;
}

.nav-link {
  text-decoration: none;
  color: #007bff;
  font-weight: 500;
  padding: 0.25rem 0;
}

.nav-link:hover {
  color: #0056b3;
  text-decoration: underline;
}

.nav-separator {
  color: #ccc;
  margin: 0 0.75rem;
}

.container {
  margin: 0 auto;
  padding: 0 15px;
}

.app-footer {
  margin-top: 2rem;
  padding: 1rem 0;
  background-color: #f8f9fa;
  color: #6c757d;
  text-align: center;
}
</style>