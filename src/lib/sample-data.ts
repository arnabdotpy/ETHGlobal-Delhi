// Development helper functions for testing property listings

export const sampleProperties = [
  {
    name: "Modern Downtown Apartment",
    location: "123 Main St, Downtown",
    rent: "50.0", // HBAR
    deposit: "100.0", // HBAR
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400"
  },
  {
    name: "Cozy Studio Near University",
    location: "456 College Ave, University District",
    rent: "35.0",
    deposit: "70.0",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400"
  },
  {
    name: "Luxury Penthouse",
    location: "789 High Rise Blvd, Uptown",
    rent: "150.0",
    deposit: "300.0",
    image: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=400"
  },
  {
    name: "Family House with Garden",
    location: "321 Suburban Lane, Quiet Neighborhood",
    rent: "80.0",
    deposit: "160.0",
    image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400"
  }
]

// Function to pre-fill form with sample data
export const fillSampleData = (index: number = 0) => {
  const sample = sampleProperties[index % sampleProperties.length]
  return {
    name: sample.name,
    location: sample.location,
    rent: sample.rent,
    deposit: sample.deposit,
    uri: sample.image
  }
}

// Function to get random sample property
export const getRandomSample = () => {
  const index = Math.floor(Math.random() * sampleProperties.length)
  return fillSampleData(index)
}