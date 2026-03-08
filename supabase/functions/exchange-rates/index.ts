import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Free exchange rate API (no key required)
const API_URL = 'https://api.exchangerate-api.com/v4/latest';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { base = 'USD' } = await req.json();

    const response = await fetch(`${API_URL}/${base}`);
    if (!response.ok) {
      throw new Error(`Exchange rate API failed [${response.status}]`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({
      base: data.base,
      rates: data.rates,
      timestamp: data.time_last_updated,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Exchange rate error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
