<template>
  <div id="app">
    <header>
      <h1>태깅맵</h1>
      <nav>
        <router-link to="/">홈</router-link>
      </nav>
    </header>
    
    <!-- 라우터에 따라 다른 컴포넌트를 표시하는 영역 -->
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eaeaea;
}

nav {
  padding: 10px 0;
}

nav a {
  margin-right: 10px;
  color: #2c3e50;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

nav a:hover {
  background-color: #f5f5f5;
}

nav a.router-link-active {
  color: #42b983;
  font-weight: bold;
}

table {
  border-collapse: collapse;
  width: 100%;
  overflow-x: auto;
  display: block;
  margin-bottom: 20px;
}

th, td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: left;
  font-size: 14px;
}

th {
  background-color: #f2f2f2;
  position: sticky;
  top: 0;
}

img {
  max-width: 100%;
  height: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.loading, .error {
  text-align: center;
  padding: 40px 0;
}
</style>