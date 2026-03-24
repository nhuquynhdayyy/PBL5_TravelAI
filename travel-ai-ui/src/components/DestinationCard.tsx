import { Link } from 'react-router-dom';

const DestinationCard = ({ destination }: { destination: any }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
      <img src={destination.imageUrl} alt={destination.name} className="w-full h-48 object-cover" />
      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-800">{destination.name}</h3>
        <p className="text-gray-600 text-sm line-clamp-2 mt-2">{destination.description}</p>
        
        {/* ✅ QUAN TRỌNG: Sửa thành destination.id */}
        <Link 
          to={`/destinations/${destination.id}`} 
          className="mt-4 block w-full bg-blue-500 text-white text-center py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          Khám phá ngay
        </Link>
      </div>
    </div>
  );
};

export default DestinationCard;