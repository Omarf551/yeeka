import { projectId, publicAnonKey } from './supabase/info';

export async function initializeData() {
  try {
    // Check if data already exists
    const usersResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/users`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    const usersData = await usersResponse.json();
    
    if (usersData.users && usersData.users.length > 0) {
      console.log('Data already initialized');
      return;
    }

    console.log('Initializing demo data...');

    // Create demo users
    const users = [
      { nombre: 'Administrador', usuario: 'admin', password: 'admin123', rol: 'administrador' },
      { nombre: 'Carlos Mesero', usuario: 'mesero', password: 'mesero123', rol: 'mesero' },
      { nombre: 'Ana Cocinera', usuario: 'cocinero', password: 'cocinero123', rol: 'cocinero' },
      { nombre: 'Luis Cajero', usuario: 'cajero', password: 'cajero123', rol: 'cajero' },
    ];

    for (const user of users) {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(user),
        }
      );
    }

    // Create demo categories
    const categorias = [
      { nombre: 'Entradas' },
      { nombre: 'Platos Principales' },
      { nombre: 'Bebidas' },
      { nombre: 'Postres' },
    ];

    const createdCategorias = [];
    for (const categoria of categorias) {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/categorias`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(categoria),
        }
      );
      const data = await response.json();
      createdCategorias.push(data.categoria);
    }

    // Create demo products
    const productos = [
      { nombre: 'Ensalada César', precio: 8.50, categoria_id: createdCategorias[0].id },
      { nombre: 'Nachos con Queso', precio: 7.00, categoria_id: createdCategorias[0].id },
      { nombre: 'Hamburguesa Clásica', precio: 12.00, categoria_id: createdCategorias[1].id },
      { nombre: 'Pizza Margarita', precio: 14.50, categoria_id: createdCategorias[1].id },
      { nombre: 'Pasta Carbonara', precio: 13.00, categoria_id: createdCategorias[1].id },
      { nombre: 'Filete de Pollo', precio: 15.00, categoria_id: createdCategorias[1].id },
      { nombre: 'Refresco', precio: 2.50, categoria_id: createdCategorias[2].id },
      { nombre: 'Jugo Natural', precio: 3.50, categoria_id: createdCategorias[2].id },
      { nombre: 'Agua Mineral', precio: 2.00, categoria_id: createdCategorias[2].id },
      { nombre: 'Café', precio: 2.50, categoria_id: createdCategorias[2].id },
      { nombre: 'Tiramisu', precio: 6.00, categoria_id: createdCategorias[3].id },
      { nombre: 'Helado', precio: 5.00, categoria_id: createdCategorias[3].id },
      { nombre: 'Flan', precio: 4.50, categoria_id: createdCategorias[3].id },
    ];

    for (const producto of productos) {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-402bd9dc/productos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(producto),
        }
      );
    }

    console.log('Demo data initialized successfully!');
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}
