          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Product</label>
              <div class="mt-1 text-sm text-gray-900">{{ editingOrder.product?.name }}</div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Links</label>
              <div class="mt-1 flex space-x-4">
                <a 
                  v-if="editingOrder.product?.product_link"
                  :href="editingOrder.product.product_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <i class="fas fa-external-link-alt mr-2"></i>
                  Product Page
                </a>
                <a 
                  v-if="editingOrder.product?.video_link"
                  :href="editingOrder.product.video_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <i class="fas fa-video mr-2"></i>
                  Video
                </a>
              </div>
            </div>
          </div> 