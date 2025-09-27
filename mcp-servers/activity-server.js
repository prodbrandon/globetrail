import express from 'express';
import cors from 'cors';

const app = express();
const port = process.argv[2] || 3003;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', server: 'activity-server' });
});

// MCP tool call endpoint
app.post('/call-tool', async (req, res) => {
    const { tool, parameters } = req.body;
    
    try {
        let result = {};
        
        switch (tool) {
            case 'search_activities':
                result = await searchActivities(parameters);
                break;
            case 'get_activity_details':
                result = await getActivityDetails(parameters);
                break;
            case 'book_activity':
                result = await bookActivity(parameters);
                break;
            default:
                return res.status(400).json({ error: `Unknown tool: ${tool}` });
        }
        
        res.json(result);
    } catch (error) {
        console.error(`Error in ${tool}:`, error);
        res.status(500).json({ error: error.message });
    }
});

async function searchActivities(params) {
    const { location, date, category, budget_range } = params;
    
    // Mock activity search results
    return {
        activities: [
            {
                id: 'ACT001',
                name: 'City Walking Tour',
                category: 'Sightseeing',
                location,
                duration: '3 hours',
                price: 25,
                rating: 4.6,
                description: 'Explore the historic downtown area with a knowledgeable local guide.',
                includes: ['Professional guide', 'Historical insights', 'Photo opportunities']
            },
            {
                id: 'ACT002',
                name: 'Food & Wine Tasting',
                category: 'Culinary',
                location,
                duration: '2.5 hours',
                price: 65,
                rating: 4.8,
                description: 'Sample local cuisine and wines at the best spots in the city.',
                includes: ['Food tastings', 'Wine pairings', 'Local guide']
            },
            {
                id: 'ACT003',
                name: 'Adventure Hiking Trail',
                category: 'Outdoor',
                location,
                duration: '5 hours',
                price: 45,
                rating: 4.4,
                description: 'Challenging hike with breathtaking views and wildlife spotting.',
                includes: ['Equipment rental', 'Safety briefing', 'Snacks']
            },
            {
                id: 'ACT004',
                name: 'Museum & Art Gallery Tour',
                category: 'Culture',
                location,
                duration: '4 hours',
                price: 35,
                rating: 4.3,
                description: 'Discover local art and history in the citys premier cultural institutions.',
                includes: ['Museum entries', 'Audio guide', 'Expert commentary']
            }
        ],
        search_params: { location, date, category, budget_range }
    };
}

async function getActivityDetails(params) {
    const { activity_id } = params;
    
    // Mock activity details
    return {
        activity: {
            id: activity_id,
            name: 'City Walking Tour',
            full_description: 'Join us for an immersive 3-hour walking tour through the historic heart of the city. Our expert local guides will share fascinating stories, hidden gems, and insider knowledge about the areas rich history and vibrant culture.',
            schedule: [
                { time: '9:00 AM', activity: 'Meet at central square' },
                { time: '9:15 AM', activity: 'Historic district exploration' },
                { time: '10:30 AM', activity: 'Local market visit' },
                { time: '11:45 AM', activity: 'Scenic viewpoint stop' },
                { time: '12:00 PM', activity: 'Tour conclusion' }
            ],
            requirements: ['Comfortable walking shoes', 'Weather-appropriate clothing'],
            meeting_point: 'Central Square Fountain',
            cancellation_policy: 'Free cancellation up to 24 hours before start time',
            group_size: 'Maximum 15 people'
        }
    };
}

async function bookActivity(params) {
    const { activity_id, date, participants, contact_info } = params;
    
    // Mock booking confirmation
    return {
        booking: {
            confirmation_id: 'BK' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            activity_id,
            date,
            participants,
            total_price: participants * 25,
            status: 'confirmed',
            payment_status: 'pending',
            instructions: 'Please arrive 15 minutes before the scheduled start time at the meeting point.'
        }
    };
}

app.listen(port, () => {
    console.log(`Activity server running on port ${port}`);
});